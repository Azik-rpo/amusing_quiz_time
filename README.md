# 🎮 Amusing Quiz Time - Online Quiz Game

Modern neon-styled quiz game with multiplayer support, custom quizzes, mini-games, and online leaderboard.

## Features

✨ **Core Features**

- Interactive quiz game with neon/cyber visual style
- 5 difficulty levels with different time limits
- Custom quiz creation (20-40 questions)
- Mini-games between questions (5 types)
- Leaderboard (local + online)
- Team profiles with detailed information

🎮 **Mini-games**

1. **Quick Tap** - Tap button as fast as possible
2. **Bowling** - Launch bowling strikes
3. **Flappy Neon** - Navigate through obstacles
4. **Maze** - Arrow keys to reach the goal
5. **Color Match** - Find matching colors

🌐 **Multiplayer Features**

- Create rooms with custom quizzes
- Join rooms by code or link
- Real-time synchronization via WebSocket
- Online leaderboard (top 50 players)
- Share quizzes via encrypted links

## Installation

### Prerequisites

- Node.js 14+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Setup

1. **Install backend dependencies:**

```bash
cd "c:\project aqt"
npm install
```

2. **Start the server:**

```bash
npm start
# Server runs on http://localhost:3000
```

3. **Open in browser:**

```bash
# From project folder, run a simple HTTP server
python -m http.server 8000
# Or use: npx serve -s .
# Then open: http://localhost:8000
```

## Usage

### Single Player

1. Enter nickname and password
2. Choose difficulty (Easy/Medium/Hard)
3. Answer 30 questions
4. Mini-games trigger every 5 questions
5. View results on leaderboard

### Multiplayer

1. Go to Lobby → "Создать квиз" (Create Quiz)
2. Add 20-40 questions or use templates
3. Save and click "Создать комнату" (Create Room)
4. Share link/code with other players
5. Players join via code or link
6. Start game when ready
7. Results sync to server

### Custom Quiz Creator

- **Шаблоны** (Templates): Pre-filled with 20+ questions (Computer Science, General Knowledge)
- **Drag-n-drop**: Reorder questions with mouse
- **Preview**: See quiz before saving
- **Validation**: Enforces 20-40 questions, 2-4 answers each

## File Structure

```
project aqt/
├── index.html           # Main HTML (screens, modals)
├── script.js            # Frontend logic (60+ functions)
├── style.css            # Neon/cyber styling
├── server.js            # Node.js WebSocket server
├── package.json         # Dependencies
└── README.md            # This file
```

## API Endpoints

**HTTP Endpoints** (for game results & leaderboard)

- `POST /api/rooms` - Create room
- `POST /api/rooms/:code/join` - Join room
- `GET /api/leaderboard` - Get top 50 players
- `POST /api/results` - Save game result
- `GET /api/recent-games` - Get recent games

**WebSocket Events**

- `join-room` - Player joins room
- `start-game` - Host starts game
- `answer-submitted` - Player submits answer
- `game-finished` - Player completes quiz
- `player-joined` / `player-finished` - Broadcast to room

## Key Functions

**Game Logic**

- `startGame(difficulty)` - Start quiz
- `confirmAnswer()` - Submit answer
- `nextQuestion()` - Move to next question
- `finishGame()` - End game, save results

**Multiplayer**

- `createRoomForQuiz(quizId)` - Create room
- `joinByCode(code)` - Join room
- `initSocket()` - Initialize WebSocket

**Quiz Creator**

- `openQuizCreator()` - Open modal
- `addQuestionBuilder()` - Add question
- `saveCustomQuiz()` - Validate & save
- `loadTemplate()` - Load template questions
- `previewQuiz()` - Show preview

**Mini-games**

- `openEventScreen()` - Random event
- `startQuickTapMiniGame()` - Tap mini-game
- `startBowlingMiniGame()` - Bowling mini-game
- `startFlappyMiniGame()` - Flappy mini-game
- `startMazeMiniGame()` - Maze mini-game
- `startColorMatchMiniGame()` - Color match mini-game

**Leaderboard**

- `showLeaderboard()` - Display leaderboard (local + online)
- `saveRecord(name, score)` - Save result

## Styling

- **Color Scheme**: Neon cyan (#00ffcc), magenta, yellow
- **Effects**: Glow, blur, scanlines, animations
- **Responsive**: Works on mobile, tablet, desktop

## Browser Compatibility

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+

## Development

### Run with hot reload

```bash
npm install --save-dev nodemon
npm run dev
```

### Customize Settings

- `maxTime` - Question time limit
- `answersSinceEvent` - Questions between events
- Template questions in `loadTemplate()`

## Future Improvements

- [ ] User accounts with persistent profiles
- [ ] Team multiplayer mode
- [ ] Achievements & badges
- [ ] Mobile app (React Native)
- [ ] Voice chat during multiplayer
- [ ] More mini-games
- [ ] Analytics & statistics

## License

MIT

## Support

For issues or questions, check the console (F12) for WebSocket connection status.

**Development Server**: http://localhost:3000
**Frontend**: http://localhost:8000

---

Made with ❤️ using HTML, CSS, JavaScript, Node.js & Socket.io
