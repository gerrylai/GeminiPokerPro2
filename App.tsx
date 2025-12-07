import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AppMode, Player, PlayerType, PlayerStatus, GameStage, Card, Suit, Rank
} from './types';
import { INITIAL_CHIPS, SMALL_BLIND, BIG_BLIND, BOT_NAMES } from './constants';
import * as Poker from './utils/pokerLogic';
import * as Gemini from './services/geminiService';
import Table from './components/Table';

// Simple SVG Icons
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LOBBY);
  const [userName, setUserName] = useState('');
  const [gameMode, setGameMode] = useState<'PVE' | 'PVP'>('PVE');
  
  // Game State
  const [players, setPlayers] = useState<Player[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [dealerIndex, setDealerIndex] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(0); // Player Index
  const [stage, setStage] = useState<GameStage>(GameStage.PREFLOP);
  const [currentBet, setCurrentBet] = useState(0); // Highest bet in current round
  const [minRaise, setMinRaise] = useState(BIG_BLIND);
  const [message, setMessage] = useState('欢迎来到德州扑克！');
  const [commentary, setCommentary] = useState('');

  // Refs for auto-play logic avoiding dependency cycles
  const playersRef = useRef(players);
  playersRef.current = players;
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const turnRef = useRef(currentTurn);
  turnRef.current = currentTurn;
  const gameActiveRef = useRef(false);

  // Initialize Game
  const startGame = (type: 'PVE' | 'PVP') => {
    if (!userName.trim()) {
      alert("请输入您的昵称");
      return;
    }

    const human: Player = {
      id: 'p1',
      name: userName,
      type: PlayerType.HUMAN,
      chips: INITIAL_CHIPS,
      bet: 0,
      status: PlayerStatus.ACTIVE,
      hand: [],
      position: 0,
    };

    let newPlayers: Player[] = [human];

    if (type === 'PVE') {
      // Add 5 Bots
      const bots: Player[] = BOT_NAMES.slice(0, 5).map((name, i) => ({
        id: `bot-${i}`,
        name: name,
        type: PlayerType.BOT,
        chips: INITIAL_CHIPS,
        bet: 0,
        status: PlayerStatus.ACTIVE,
        hand: [],
        position: i + 1,
      }));
      newPlayers = [...newPlayers, ...bots];
    } else {
      // Simulate PvP Lobby (Just UI for now, logic defaults to bots for demo)
       const mockHumans: Player[] = Array.from({length: 7}, (_, i) => ({
        id: `user-${i}`,
        name: `玩家 ${i+2}`,
        type: PlayerType.BOT, // Keeping as BOT for logic, but pretending human
        chips: INITIAL_CHIPS,
        bet: 0,
        status: PlayerStatus.ACTIVE,
        hand: [],
        position: i + 1,
      }));
      newPlayers = [...newPlayers, ...mockHumans];
    }

    setPlayers(newPlayers);
    setMode(AppMode.GAME);
    setDealerIndex(Math.floor(Math.random() * newPlayers.length));
    gameActiveRef.current = true;
    startNewRound(newPlayers, Math.floor(Math.random() * newPlayers.length));
  };

  const startNewRound = (currentPlayers: Player[], dealerIdx: number) => {
    // Reset state
    const newDeck = Poker.createDeck();
    let p = [...currentPlayers].map(pl => ({
      ...pl, 
      bet: 0, 
      hand: [], 
      status: pl.chips > 0 ? PlayerStatus.ACTIVE : PlayerStatus.BUSTED,
      lastAction: ''
    }));

    // Deal hole cards
    for (let i = 0; i < 2; i++) {
      p.forEach(pl => {
        if (pl.status !== PlayerStatus.BUSTED) {
          pl.hand.push(newDeck.pop()!);
        }
      });
    }

    // Blinds
    const sbIndex = (dealerIdx + 1) % p.length;
    const bbIndex = (dealerIdx + 2) % p.length;
    let turnIndex = (dealerIdx + 3) % p.length;
    
    // Handle simplified heads-up logic if needed, but assuming 6 players
    
    // Post Blinds
    let potAmt = 0;
    if (p[sbIndex].status !== PlayerStatus.BUSTED) {
      const sbAmt = Math.min(p[sbIndex].chips, SMALL_BLIND);
      p[sbIndex].chips -= sbAmt;
      p[sbIndex].bet = sbAmt;
      potAmt += sbAmt;
      p[sbIndex].lastAction = '小盲';
    }
    
    if (p[bbIndex].status !== PlayerStatus.BUSTED) {
      const bbAmt = Math.min(p[bbIndex].chips, BIG_BLIND);
      p[bbIndex].chips -= bbAmt;
      p[bbIndex].bet = bbAmt;
      potAmt += bbAmt;
      p[bbIndex].lastAction = '大盲';
    }

    setDeck(newDeck);
    setPlayers(p);
    setPot(potAmt);
    setCurrentBet(BIG_BLIND);
    setCommunityCards([]);
    setStage(GameStage.PREFLOP);
    setCurrentTurn(turnIndex);
    setDealerIndex(dealerIdx);
    setMessage(`第 ${dealerIdx + 1} 局开始，请下注`);
    setCommentary('');
  };

  // Bot Logic Engine
  useEffect(() => {
    if (!gameActiveRef.current) return;
    if (stageRef.current === GameStage.SHOWDOWN) return;

    const currentPlayer = playersRef.current[turnRef.current];
    if (!currentPlayer) return;

    // Skip folded/busted players
    if (currentPlayer.status !== PlayerStatus.ACTIVE) {
       advanceTurn();
       return;
    }

    // If it's a bot, execute move
    if (currentPlayer.type === PlayerType.BOT) {
      const timer = setTimeout(() => {
        executeBotMove(currentPlayer);
      }, 1000 + Math.random() * 1000); // Natural delay
      return () => clearTimeout(timer);
    }
  }, [currentTurn, stage, players]);

  const executeBotMove = async (bot: Player) => {
    // Very Simple AI Logic
    const callAmount = currentBet - bot.bet;
    const isHighHand = bot.hand.length === 2 && (bot.hand[0].value > 10 || bot.hand[0].value === bot.hand[1].value);
    const random = Math.random();

    let action = 'fold';
    
    if (callAmount === 0) {
      action = random > 0.2 ? 'check' : 'raise';
    } else if (callAmount > bot.chips) {
       action = isHighHand || random > 0.8 ? 'allin' : 'fold';
    } else {
       if (isHighHand || random > 0.4) action = 'call';
       else if (random > 0.9) action = 'raise';
       else action = 'fold';
    }

    // Bot Chat Trigger
    if (action === 'raise' && Math.random() > 0.8) {
        Gemini.generateBotChat(bot.name, 'raise').then(txt => {
            setPlayers(prev => prev.map(p => p.id === bot.id ? {...p, lastAction: `"${txt}"`} : p));
        });
    }

    handleAction(bot.id, action);
  };

  const handleAction = (playerId: string, actionType: string, amount?: number) => {
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      const playerIdx = newPlayers.findIndex(p => p.id === playerId);
      if (playerIdx === -1) return prevPlayers;

      const player = newPlayers[playerIdx];
      let actionText = '';

      if (actionType === 'fold') {
        player.status = PlayerStatus.FOLDED;
        actionText = '弃牌';
      } else if (actionType === 'check') {
        actionText = '过牌';
      } else if (actionType === 'call') {
        const toCall = currentBet - player.bet;
        const actualCall = Math.min(player.chips, toCall);
        player.chips -= actualCall;
        player.bet += actualCall;
        setPot(p => p + actualCall);
        actionText = '跟注';
      } else if (actionType === 'raise') {
        const raiseAmt = amount || (currentBet - player.bet + minRaise);
        const actualRaise = Math.min(player.chips, raiseAmt);
        player.chips -= actualRaise;
        player.bet += actualRaise;
        setPot(p => p + actualRaise);
        setCurrentBet(player.bet);
        setMinRaise(BIG_BLIND); // Reset min raise logic simply
        actionText = `加注 ${player.bet}`;
      } else if (actionType === 'allin') {
        const allInAmt = player.chips;
        player.chips = 0;
        player.bet += allInAmt;
        player.status = PlayerStatus.ALL_IN;
        setPot(p => p + allInAmt);
        if (player.bet > currentBet) setCurrentBet(player.bet);
        actionText = 'All In!';
      }

      player.lastAction = actionText;
      return newPlayers;
    });

    // Move to next turn immediately after state update logic would settle
    // But we need to do it after render cycle usually, so we use a flag or effect
    // Here we just call helper
    setTimeout(() => advanceTurn(), 100);
  };

  const advanceTurn = () => {
    // Check if round is complete (all active players have matched bet)
    // Simplified: Check if everyone acted
    const activePlayers = playersRef.current.filter(p => p.status === PlayerStatus.ACTIVE || p.status === PlayerStatus.ALL_IN);
    const notFolded = playersRef.current.filter(p => p.status !== PlayerStatus.FOLDED && p.status !== PlayerStatus.BUSTED);
    
    // Check win condition (everyone folded)
    if (notFolded.length === 1) {
      endRound(notFolded[0]);
      return;
    }

    // Find next player
    let nextIndex = (turnRef.current + 1) % playersRef.current.length;
    let loopCount = 0;
    
    // Skip folded/busted
    while (
      (playersRef.current[nextIndex].status === PlayerStatus.FOLDED || 
       playersRef.current[nextIndex].status === PlayerStatus.BUSTED ||
       playersRef.current[nextIndex].status === PlayerStatus.ALL_IN
      ) && loopCount < playersRef.current.length
    ) {
      nextIndex = (nextIndex + 1) % playersRef.current.length;
      loopCount++;
    }

    // Check if betting round is over
    // Round is over if all active players have bet equal to currentBet (and not 0 unless check allowed)
    // AND everyone has had a chance to act (trickier to track simply, usually utilize 'playersToAct' counter)
    // Simplified logic: If we circled back to the person who made the last aggressive action (raise) or Big Blind
    
    const isRoundComplete = activePlayers.every(p => p.bet === currentBet || p.status === PlayerStatus.ALL_IN) && activePlayers.length > 0;
    
    // Hacky check: if loop count is high, everyone is all in or folded except one?
    
    if (isRoundComplete && loopCount < playersRef.current.length) {
       // Only move stage if everyone matched bets. 
       // We need to ensure the aggressor doesn't get skipped if others just call.
       // For this simplified demo, we transition if everyone matched.
       
       // EXCEPT if we just started the round (Preflop) and BB hasn't acted? 
       // Simplicity trade-off: transitions when bets equal.
       nextStage();
    } else {
       setCurrentTurn(nextIndex);
    }
  };

  const nextStage = () => {
    const currentStage = stageRef.current;
    let nextS = GameStage.PREFLOP;
    let newCards: Card[] = [];

    // Reset bets for next round
    setPlayers(prev => prev.map(p => ({...p, bet: 0, lastAction: ''})));
    setCurrentBet(0);

    if (currentStage === GameStage.PREFLOP) {
      nextS = GameStage.FLOP;
      newCards = [deck[0], deck[1], deck[2]];
      setDeck(d => d.slice(3));
    } else if (currentStage === GameStage.FLOP) {
      nextS = GameStage.TURN;
      newCards = [deck[0]];
      setDeck(d => d.slice(1));
    } else if (currentStage === GameStage.TURN) {
      nextS = GameStage.RIVER;
      newCards = [deck[0]];
      setDeck(d => d.slice(1));
    } else if (currentStage === GameStage.RIVER) {
      nextS = GameStage.SHOWDOWN;
      // Trigger showdown
      handleShowdown();
      return;
    }

    setCommunityCards(prev => [...prev, ...newCards]);
    setStage(nextS);
    // Start turn from Small Blind position (or first active after dealer)
    let nextIndex = (dealerIndex + 1) % playersRef.current.length;
    while(playersRef.current[nextIndex].status !== PlayerStatus.ACTIVE && playersRef.current[nextIndex].status !== PlayerStatus.ALL_IN) {
        nextIndex = (nextIndex + 1) % playersRef.current.length;
    }
    setCurrentTurn(nextIndex);
  };

  const handleShowdown = async () => {
    setStage(GameStage.SHOWDOWN);
    const active = playersRef.current.filter(p => p.status !== PlayerStatus.FOLDED && p.status !== PlayerStatus.BUSTED);
    
    let bestPlayer: Player | null = null;
    let maxScore = -1;
    let winHandName = '';

    active.forEach(p => {
      const result = Poker.evaluateHand(p.hand, communityCards);
      if (result.score > maxScore) {
        maxScore = result.score;
        bestPlayer = p;
        winHandName = result.rankName;
      }
    });

    if (bestPlayer) {
      endRound(bestPlayer, winHandName);
    }
  };

  const endRound = (winner: Player, handName: string = '对方弃牌') => {
    setStage(GameStage.SHOWDOWN);
    setMessage(`${winner.name} 赢得了 ${pot} 筹码! (${handName})`);
    
    // Update chips
    setPlayers(prev => prev.map(p => {
      if (p.id === winner.id) {
        return { ...p, chips: p.chips + pot, lastAction: 'WINNER 🏆' };
      }
      return p;
    }));

    // AI Commentary
    Gemini.generateGameCommentary(winner.name, handName, pot, winner.type === PlayerType.HUMAN).then(c => {
      setCommentary(c);
    });

    // Auto start next round after delay
    setTimeout(() => {
       const survivingPlayers = playersRef.current.filter(p => p.chips > 0 || (p.id === winner.id)); // Winner has chips now
       if (survivingPlayers.length < 2) {
          alert("游戏结束！胜利者: " + winner.name);
          setMode(AppMode.LOBBY);
       } else {
         const nextDealer = (dealerIndex + 1) % players.length; // Original length to keep positions
         startNewRound(playersRef.current, nextDealer);
       }
    }, 5000);
  };

  // UI Handlers
  const handleUserAction = (action: string) => {
    if (players[currentTurn].type !== PlayerType.HUMAN) return;
    handleAction(players[currentTurn].id, action);
  };

  // --- Render ---

  if (mode === AppMode.LOBBY) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 mb-2">
              Gemini Poker Pro
            </h1>
            <p className="text-gray-400">德州扑克竞技场</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-2 text-sm font-bold">玩家昵称</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 px-4 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
                  placeholder="输入你的名字..." 
                />
                <div className="absolute left-3 top-3.5 text-gray-500"><UserIcon /></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setGameMode('PVE')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${gameMode === 'PVE' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-gray-700 hover:border-gray-600 text-gray-400'}`}
              >
                <span className="text-xl font-bold mb-1">人机对战</span>
                <span className="text-xs">1 人类 vs 5 AI</span>
              </button>
              <button 
                onClick={() => setGameMode('PVP')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${gameMode === 'PVP' ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-gray-700 hover:border-gray-600 text-gray-400'}`}
              >
                <span className="text-xl font-bold mb-1">在线对战</span>
                <span className="text-xs">多人竞技大厅</span>
              </button>
            </div>

            <button 
              onClick={() => startGame(gameMode)}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-black font-bold py-4 rounded-xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <PlayIcon /> 开始游戏
            </button>
            
            <div className="text-center text-xs text-gray-500 mt-4">
              Powered by Google Gemini AI
            </div>
          </div>
        </div>
      </div>
    );
  }

  const humanPlayer = players.find(p => p.type === PlayerType.HUMAN);
  const isHumanTurn = players[currentTurn]?.type === PlayerType.HUMAN;
  const humanCanCheck = isHumanTurn && (currentBet - (humanPlayer?.bet || 0) === 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-2 md:p-4 bg-gray-800 border-b border-gray-700 z-10">
         <div className="font-bold text-yellow-500">GPP 德州扑克</div>
         <div className="text-xs md:text-sm text-gray-300">
           {stage === GameStage.SHOWDOWN ? '结算' : `当前阶段: ${stage}`} | 底池: {pot} | 盲注: {SMALL_BLIND}/{BIG_BLIND}
         </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 relative flex items-center justify-center bg-[#1a1a1a] overflow-y-auto">
        <Table 
          players={players} 
          communityCards={communityCards} 
          pot={pot}
          currentTurn={currentTurn}
          dealerIndex={dealerIndex}
          stage={stage}
        />
        
        {/* Commentary Overlay */}
        {commentary && (
           <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/70 px-6 py-3 rounded-full text-yellow-300 font-medium border border-yellow-500/30 backdrop-blur-md animate-pulse z-40 text-center max-w-[90%]">
              🤖 荷官AI: {commentary}
           </div>
        )}

        {/* Status Message */}
        <div className="absolute bottom-24 md:bottom-32 left-1/2 transform -translate-x-1/2 text-center w-full pointer-events-none z-30">
          <span className="bg-black/60 px-4 py-1 rounded text-gray-200 text-sm md:text-base backdrop-blur-sm">
            {message}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-2 md:p-4 pb-6 md:pb-8 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 md:gap-4">
          {/* User Info */}
          <div className="hidden md:flex flex-col items-start bg-black/30 p-2 rounded">
             <span className="text-xs text-gray-400">你的筹码</span>
             <span className="text-xl font-bold text-gold">{humanPlayer?.chips || 0}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex-1 flex justify-center gap-2 md:gap-4">
             <button 
               disabled={!isHumanTurn}
               onClick={() => handleUserAction('fold')}
               className="bg-red-900/80 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-red-100 font-bold py-3 px-6 rounded-lg shadow border border-red-700 transition-all w-24"
             >
               弃牌
             </button>
             
             {humanCanCheck ? (
               <button 
                  disabled={!isHumanTurn}
                  onClick={() => handleUserAction('check')}
                  className="bg-blue-900/80 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-blue-100 font-bold py-3 px-6 rounded-lg shadow border border-blue-700 transition-all w-24"
               >
                  过牌
               </button>
             ) : (
                <button 
                  disabled={!isHumanTurn}
                  onClick={() => handleUserAction('call')}
                  className="bg-green-900/80 hover:bg-green-700 disabled:opacity-30 disabled:cursor-not-allowed text-green-100 font-bold py-3 px-6 rounded-lg shadow border border-green-700 transition-all w-24"
               >
                  跟注 {currentBet - (humanPlayer?.bet || 0)}
               </button>
             )}

             <button 
               disabled={!isHumanTurn}
               onClick={() => handleUserAction('raise')}
               className="bg-yellow-600/80 hover:bg-yellow-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg shadow border border-yellow-500 transition-all w-24"
             >
               加注
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;