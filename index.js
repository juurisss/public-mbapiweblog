const express = require('express');
const mineflayer = require('mineflayer');
const useragent = require('useragent');
const { Webhook } = require('discord-webhook-node');
const { pathfinder, goals } = require('mineflayer-pathfinder');
const { setTimeout } = require('timers/promises');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const axios = require('axios');
const lbChecker = require('./lbChecker.js');
const { botArgs, password, joincounter } = require('./config.js');

const app = express();
const port = process.env.PORT || 80;

const baseDatabaseDir = path.join(__dirname, 'databases');

function generateDatabaseDir() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    const databaseDir = path.join(baseDatabaseDir, formattedDate);

    if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir, { recursive: true });
    }

    const leaderboardDir = path.join(databaseDir, 'leaderboard');
    if (!fs.existsSync(leaderboardDir)) {
        fs.mkdirSync(leaderboardDir, { recursive: true });
    }

    return databaseDir;
}

function timeUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    return midnight - now;
}

function scheduleNextDatabaseDir() {
    const timeUntilMidnightMs = timeUntilMidnight();
    const hours = Math.floor(timeUntilMidnightMs / (60 * 60 * 1000));
    const minutes = Math.floor((timeUntilMidnightMs % (60 * 60 * 1000)) / (60 * 1000));

    console.log(`Next Scheduled Database Dir: ${hours} hours ${minutes} minutes`);
    setTimeout(() => {
        const newDatabaseDir = generateDatabaseDir();
        console.log(`New database directory created: ${newDatabaseDir}`);

        scheduleNextDatabaseDir();
    }, timeUntilMidnightMs);
}   

const databaseDir = generateDatabaseDir();

const discordWebhookURL = '';
let bot;

const initBot = () => {
    const cwp = `/reg ${password}`;
    const rwp = `/login ${password}`
    const players = new Map();

    bot = mineflayer.createBot(botArgs);

    bot.once('login', () => {
        login();
        setTimeout(() => {
            bot.chat('Bot Has Successfully joined the lobby');
        }, 15000);
        setTimeout(() => {
            bot.chat('test')    
        }, 7000);
        setInterval(jump, 3000);
    });

    function login() {
        bot.chat(cwp);
        bot.chat(rwp);
        setTimeout(() => {
            performActions
            bot.chat('test')
        }, 5000);
    }

    function performActions() {
        console.log('13214');
        bot.loadPlugin(pathfinder);
        const targetPosition = { x: -8, y: 98.5, z: -38 };
        const goal = new goals.GoalBlock(targetPosition.x, targetPosition.y, targetPosition.z);
        bot.pathfinder.setGoal(goal);

        bot.once('goal_reached', () => {
            console.log('Reached Goal');
            const entity = bot.nearestEntity();
            if (entity) {
                bot.lookAt(entity.position.offset(0, entity.height, 0));
                bot.attack(entity);
            } else {
                console.log("Bot is not holding any item.");
            }
        });
    }
    

    function jump() {
        bot.setControlState('jump', true);
        setTimeout(() => {
            bot.setControlState('jump', false);
        }, 1000);
    }

    bot.on('message', (message) => {
        console.log(message.toAnsi());
        const formattedMessage = message.toString().trim();

        if (formattedMessage.startsWith('|| You were moved to lobby') ||
            formattedMessage.startsWith('| Chat is muted in lobby.') ||
            formattedMessage.startsWith('| Chat is muted in lobby. Please join any game mode to send messages.') ||
            formattedMessage.startsWith('| You\'re already logged in') ||
            formattedMessage.startsWith('| Successfully logged in!')) {
            performActions();
        }

        if (formattedMessage.startsWith('| Log in to your account.') || formattedMessage.startsWith('| Register your')) {
            login();
        }

        let joinCounter = 0;

        if (formattedMessage.startsWith('Connecting to bw-lobby')) {
            console.log('Joined BW-Lobby');
            
            bot.on('playerJoined', (player) => {
                if (joinCounter >= joincounter) {
                    players.set(player.username, player);
                    console.log(`${player.username} joined the lobby`);
        
                    getPlayerStats(player.username)
                    .then((statsWithUsername) => {
                        const { username, stats } = statsWithUsername;
    
                        const playerDataFile = path.join(databaseDir, `${username}.data`);
                        fs.writeFileSync(playerDataFile, JSON.stringify(stats));
                        })
                        .catch((error) => {
                            console.error(`Error fetching statistics for ${player.username}: ${error.message}`);
                        });
                }
            
                joinCounter++;
            });
        
            bot.on('playerLeft', (player) => {
                players.delete(player.username);
            });

            lbChecker.sr();
            
        }

        setTimeout(() => {
            getLeaderboards(LeaderboardStatistic.PLAYER_KILLS, LeaderboardDuration.WEEKLY)
              .then((leaderboardData) => {
                  console.log('Leaderboard Data:', leaderboardData);
              })
              .catch((error) => {
                  console.error('Error:', error);
              });
          }, 6000);

    });

    bot.on('end', () => {
        console.log(`Disconnected`);
        setTimeout(initBot, 5000);
    });

    bot.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
            console.log(`Failed to connect to ${err.address}:${err.port}`);
        } else {
            console.log(`Unhandled error: ${err}`);
        }
    });
};     

    const leaderboardCache = {};

    const LeaderboardStatistic = {
        KILLS: 0,
        DEATHS: 1,
        WINS: 2,
        GAMES: 3,
        BEDS: 4,
    };

    const LeaderboardDuration = {
        WEEKLY: 0,
        MONTHLY: 1,
        LIFETIME: 2,
    };

    async function getLeaderboards(statistic, duration = LeaderboardDuration.WEEKLY) {
        return new Promise((resolve, reject) => {
            bot.chat('/tops');
    
            bot.once('windowOpen', (window) => {
                if (window) {
                    function getLeaderboardFromItem(item) {
                        const nbtData = item.nbt?.value;
                        const rawLoreData = nbtData?.display?.value?.Lore?.value?.value;
                        const parsedLoreData = rawLoreData.map((line) => JSON.parse(line.replace(/,(?!\s*?[{["'\w])/g, '')));
                        const rawLeaderboardData = parsedLoreData.slice(2, 12).map((line) => {
                            const text = line.extra.map((text) => text.text);
                            return text;
                        });
    
                        const leaderboardData = rawLeaderboardData.map((entry) => {
                            return [entry[1], parseInt(entry[3].replace(/,/g, ''), 10)];
                        });
    
                        return leaderboardData;
                    }
    
                    if (statistic === LeaderboardStatistic.ALL) {
                        resolve(window.slots.slice(12, 17).map((slot) => getLeaderboardFromItem(slot)));
                    } else if (typeof statistic === 'number') {
                        if (duration !== LeaderboardDuration.WEEKLY) {
                            if (duration === LeaderboardDuration.LIFETIME) {
                                bot.clickWindow(statistic + 12, 0, 0);
                            }
    
                            bot.once('physicTick', () => {
                                bot.clickWindow(statistic + 12, 0, 0);
    
                                let openedMonthlyWindow = false;
    
                                bot.on('windowOpen', (window) => {
                                    if (duration === LeaderboardDuration.LIFETIME && !openedMonthlyWindow) {
                                        bot.clickWindow(statistic + 12, 0, 0);
                                        openedMonthlyWindow = true;
                                        return;
                                    }
    
                                    resolve(getLeaderboardFromItem(window.slots[statistic + 12]));
                                });
                            });
                        } else {
                            resolve(getLeaderboardFromItem(window.slots[statistic + 12]));
                            setTimeout(() => {
                            }, 500);
                        }
                    } else {
                        reject(new Error('Statistic type invalid'));
                    }
                }
            });
    
            setTimeout(() => {
                reject(new Error('Timeout: No response from Mineflayer bot.'));
                bot.removeAllListeners('message');
                if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
            }, 15000);
        });
    }

    function sendChatMessage(message) {
        bot.chat(message);
    }
    
    process.stdin.on('data', (data) => {
        const input = data.toString().trim();
        sendChatMessage(input);
    });

    app.use((req, res, next) => {
        const userAgent = useragent.parse(req.headers['user-agent']);
        console.log(`Request from ${userAgent.toString()}`);
        next();
    });

    app.get('/bw/api/stats/:username', async (req, res) => {
        const username = req.params.username;
        const selectedDate = req.query.date;
    
        try {
            const stats = await getStatsFromDatabase(username, selectedDate);
    
            if (!stats) {
                return res.status(404).json({ error: 'Statistics not found for the given date.' });
            }
    
            const placings = await parsePlayerPlacings(stats);
            const formattedStats = formatStats(username, stats, placings);
    
            res.json(formattedStats);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    async function getStatsFromDatabase(username, selectedDate) {
        return new Promise((resolve, reject) => {
            const playerDataFile = findPlayerDataFile(username, selectedDate);
    
            if (playerDataFile) {
                fs.readFile(playerDataFile, 'utf8', (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        try {
                            const stats = JSON.parse(data);
                            resolve(stats);
                        } catch (parseError) {
                            reject(parseError);
                        }
                    }
                });
            } else {
                reject(new Error(`Statistics not found for user ${username} on date ${selectedDate}`));
            }
        });
    }
    
    
    function findPlayerDataFile(username, selectedDate) {
        let playerDataFile = null;
    
        if (selectedDate) {
            const formattedSelectedDate = formatDate(new Date(selectedDate));
            const playerDataFileSelectedDate = path.join(baseDatabaseDir, formattedSelectedDate, `${username}.data`);
    
            if (fs.existsSync(playerDataFileSelectedDate)) {
                return playerDataFileSelectedDate;
            } else {
                fs.mkdirSync(path.join(baseDatabaseDir, formattedSelectedDate), { recursive: true });
                return playerDataFileSelectedDate;
            }
        } else {
            const today = new Date();
            for (let daysAgo = 0; daysAgo <= 30; daysAgo++) {
                const previousDay = new Date(today);
                previousDay.setDate(today.getDate() - daysAgo);
    
                const formattedPreviousDay = formatDate(previousDay);
                const tempPlayerDataFile = path.join(baseDatabaseDir, formattedPreviousDay, `${username}.data`);
    
                if (fs.existsSync(tempPlayerDataFile)) {
                    playerDataFile = tempPlayerDataFile;
                    break;
                } else {
                    fs.mkdirSync(path.join(baseDatabaseDir, formattedPreviousDay), { recursive: true });
                    playerDataFile = tempPlayerDataFile;
                }
            }
    
            return playerDataFile;
        }
    }    
    
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
     
    

    function formatStats(username, stats, placings) {
        const formattedStats = {
        username: username,
        stats: {
            kills: {
            value: parseInt(stats[0].replace(/\([^)]*\)|↪ Kills:|"|,/g, "").trim()),
            placement: placings[0] !== undefined ? placings[0] : -1,
            },
            deaths: {
            value: parseInt(stats[1].replace(/\([^)]*\)|↪ Deaths:|"|,/g, "").trim()),
            placement: placings[1] !== undefined ? placings[1] : -1,
            },
            games: {
            value: parseInt(stats[2].replace(/\([^)]*\)|↪ Games Played:|"|,/g, "").trim()),
            placement: placings[2] !== undefined ? placings[2] : -1,
            },
            wins: {
            value: parseInt(stats[3].replace(/\([^)]*\)|↪ Wins:|"|,/g, "").trim()),
            placement: placings[3] !== undefined ? placings[3] : -1,
            },
            beds: {
            value: parseInt(stats[4].replace(/\([^)]*\)|↪ Broken Beds:|"|,/g, "").trim()),
            placement: parseInt(stats[4].match(/\([^)]*\)/g)[0].replace("[\"(#", "").replace(")\"]", "").replace("(#", "").replace(")", "").trim())
            },
        }
        };
    
        return formattedStats;
    }
    
    async function getPlayerStats(playerName) {
        return new Promise((resolve, reject) => {
            const stats = [];
            let receivedStats = false;
    
            let currentUsername;
    
            bot.chat(`/stat ${playerName}`);
    
            bot.on('message', (message) => {
                const formattedMessage = message.toString().trim();
    
                const usernameMatch = formattedMessage.match(/^Statistics ▸ (.+)$/);
                if (usernameMatch) {
                    currentUsername = usernameMatch[1];
                }
    
                if (currentUsername === playerName && formattedMessage.startsWith('↪')) {
                    stats.push(formattedMessage);
    
                    if (stats.length >= 5) {
                        for (let i = 0; i < stats.length; i++) {
                            stats[i] = stats[i].replace(/Place /, '#');
                        }
                        resolve({ username: playerName, stats });
                    }
                }
            });
    
            setTimeout(() => {
                reject(new Error('Timeout: No response from Mineflayer bot.'));
            }, 15000);
        });
    }
    

    function parsePlayerPlacings(statMessages) {
        const placements = statMessages.slice(0, -1).map((message) => {
            const messageExec = /(?<=^↪ [\w ]+: [\d,]+ \(#)[\d,]+/.exec(message)

            if (messageExec) {
                return parseInt(messageExec[0].replace(',', ''))    
            } else {
                return -1
            }
        })
        return placements
    }  

    app.get('/bw/api/tops/:type', async (req, res) => {
        const { type } = req.params;
        const duration = req.query.duration || 'weekly';
    
        try {
            const cacheKey = `${type}-${duration}`;
            if (leaderboardCache[cacheKey]) {
                res.json({ leaderboardData: leaderboardCache[cacheKey] });
            } else {
                const statistic = parseLeaderboardType(type);
                if (statistic === undefined) {
                    throw new Error('Invalid leaderboard type');
                }
    
                const leaderboardData = await getLeaderboards(statistic, parseDuration(duration));
                leaderboardCache[cacheKey] = leaderboardData;
                res.json({ leaderboardData });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    function parseLeaderboardType(type) {
        switch (type.toLowerCase()) {
            case 'kills':
                return LeaderboardStatistic.KILLS;
            case 'deaths':
                return LeaderboardStatistic.DEATHS;
            case 'wins':
                return LeaderboardStatistic.WINS;
            case 'games':
                return LeaderboardStatistic.GAMES;
            case 'beds':
                return LeaderboardStatistic.BEDS;
            default:
                return undefined;
        }
    }
    function parseDuration(duration) {
        switch (duration.toLowerCase()) {
            case 'weekly':
                return LeaderboardDuration.WEEKLY;
            case 'monthly':
                return LeaderboardDuration.MONTHLY;
            case 'lifetime':
                return LeaderboardDuration.LIFETIME;
            default:
                throw new Error('Invalid duration value');
        }
    }

    app.use(express.static('public'));

    app.use('/bw', express.static(__dirname + '/web'));
    app.use('/bw/stats', express.static(__dirname + '/views'));

    app.get('/bw', (req, res) => {
        res.sendFile(__dirname + '/web/Home.html');
    });
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    app.get('/bw/stats/:username', async (req, res) => {
        const username = req.params.username;
    
        try {
            const stats = await getStatsFromDatabase(username);
    
            if (!stats) {
                return res.redirect('/notFound.html');
            }
    
            const placings = await parsePlayerPlacings(stats);
            const formattedStats = formatStats(username, stats, placings);
    
            res.render('stats', { username, stats: formattedStats });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
      

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });

    async function logLeaderboards() {
        try {
            const leaderboardData = {};

            for (const key in LeaderboardStatistic) {
                const statistic = LeaderboardStatistic[key];
                const leaderboard = await getLeaderboards(statistic, LeaderboardDuration.LIFETIME);
                leaderboardData[key] = leaderboard;
            }

            console.log('Leaderboards logged successfully.');
        } catch (error) {
            console.error('Error logging leaderboards:', error);
        }
    }

    initBot()
    scheduleNextDatabaseDir();