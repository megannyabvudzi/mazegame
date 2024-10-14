class Leaderboard {
    constructor() {
        this.scores = JSON.parse(localStorage.getItem('mazeGameLeaderboard')) || {};
    }

    addScore(level, time) {
        const key = `level${level + 1}`;
        if (!this.scores[key]) {
            this.scores[key] = [];
        }
        this.scores[key].push(time);
        this.scores[key].sort((a, b) => a - b);
        this.scores[key] = this.scores[key].slice(0, 5); // Keep only top 5 scores
        this.saveScores();
    }

    getScores(level) {
        const key = `level${level + 1}`;
        return this.scores[key] || [];
    }

    saveScores() {
        localStorage.setItem('mazeGameLeaderboard', JSON.stringify(this.scores));
    }

    displayLeaderboard() {
        const leaderboardDiv = document.getElementById('leaderboard');
        leaderboardDiv.innerHTML = '<h2>Leaderboard</h2>';
        for (let i = 0; i < 3; i++) {
            const key = `level${i + 1}`;
            const scores = this.scores[key] || [];
            const leaderboardHtml = `
                <h3>Level ${i + 1}</h3>
                <ol>
                    ${scores.map(score => `<li>${score.toFixed(2)} seconds</li>`).join('')}
                </ol>
            `;
            leaderboardDiv.innerHTML += leaderboardHtml;
        }
    }

    clearLeaderboard() {
        this.scores = {};
        this.saveScores();
        this.displayLeaderboard();
    }
}

export const leaderboard = new Leaderboard();