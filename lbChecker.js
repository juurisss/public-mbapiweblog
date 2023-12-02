const axios = require('axios');

const baseURL = 'http://127.0.0.1/bw/api/tops/';

const leaderboardTypes = ['kills', 'deaths', 'wins', 'games', 'beds'];
const leaderboardDurations = ['weekly', 'monthly', 'lifetime'];

async function sendRequests() {
    try {
        await delay(4500)
        for (const type of leaderboardTypes) {
            for (const duration of leaderboardDurations) {
                const url = `${baseURL}${type}?duration=${duration}`;
                const response = await axios.get(url);
                console.log(`Response from ${type} (${duration}):`, response.data);

                await delay(1000);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
setTimeout(() => {
    
}, 5000);
module.exports = {
    sr: sendRequests
};

