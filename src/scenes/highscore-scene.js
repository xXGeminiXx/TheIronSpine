/**
 * highscore-scene.js - Remote highscores screen
 *
 * Shows anonymous arcade-style highscores (official host only).
 */

import { PALETTE, UI, RENDER } from '../config.js';
import { formatNumber } from '../core/verylargenumbers.js';
import {
    escapeHighscoreName,
    fetchRemoteHighscores,
    fetchRemoteHighscoresForced,
    formatHighscoreValue,
    getHighscoreLastError,
    getHighscoreMaxNameLength,
    getSavedHighscoreName,
    isRemoteHighscoreEnabled
} from '../systems/remote-highscores.js';

const MODE_FILTERS = ['all', 'classic', 'endless'];
const DIFFICULTY_FILTERS = ['all', 'easy', 'normal', 'hard', 'insane'];

export class HighscoreScene extends Phaser.Scene {
    constructor() {
        super('HighscoreScene');
    }

    create() {
        const { width, height } = this.scale;

        this.isActiveScene = true;
        this.entries = [];
        this.modeFilterIndex = 0;
        this.difficultyFilterIndex = 0;

        this.add.rectangle(0, 0, width, height,
            Phaser.Display.Color.HexStringToColor(PALETTE.background).color)
            .setOrigin(0, 0);

        this.createAtmosphere(width, height);
        this.createFrame(width, height);

        const titleText = this.add.text(width * 0.5, height * 0.12, 'HALL OF SPARKS', {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.titleFontSize}px`,
            color: PALETTE.warning,
            stroke: PALETTE.uiShadow,
            strokeThickness: 4
        }).setOrigin(0.5);
        titleText.setResolution(RENDER.textResolution);

        const nameLimit = getHighscoreMaxNameLength();
        const subtitle = isRemoteHighscoreEnabled()
            ? `Official host only. Names up to ${nameLimit} chars.`
            : 'Highscores are only available on the official host.';

        const subtitleText = this.add.text(width * 0.5, height * 0.19, subtitle, {
            fontFamily: UI.fontFamily,
            fontSize: `${UI.subtitleFontSize}px`,
            color: PALETTE.uiText,
            alpha: 0.85,
            align: 'center'
        }).setOrigin(0.5);
        subtitleText.setResolution(RENDER.textResolution);

        this.createFilters(width, height);
        this.createColumnHeaders(width, height);
        this.createEntryRows(width, height);
        this.createStatusText(width, height);

        this.createButtons(width, height);

        this.loadHighscores(true);

        if (this.input.keyboard) {
            this.keyHandler = (event) => {
                if (event.code === 'Escape' || event.code === 'KeyM') {
                    this.scene.start('MenuScene');
                }
                if (event.code === 'KeyR') {
                    this.loadHighscores(true);
                }
            };
            this.input.keyboard.on('keydown', this.keyHandler);
        }

        this.events.once('shutdown', () => {
            if (this.input.keyboard && this.keyHandler) {
                this.input.keyboard.off('keydown', this.keyHandler);
            }
            this.isActiveScene = false;
            this.clearEntryRows();
        });
    }

    createAtmosphere(width, height) {
        const scanline = this.add.rectangle(width * 0.5, height * 0.3, width, 3, 0xffffff, 0.06);
        scanline.setBlendMode(Phaser.BlendModes.SCREEN);
        this.tweens.add({
            targets: scanline,
            y: height * 0.8,
            duration: 2600,
            repeat: -1,
            ease: 'Sine.easeInOut',
            yoyo: true
        });
    }

    createFrame(width, height) {
        const frame = this.add.graphics();
        const frameWidth = width * 0.86;
        const frameHeight = height * 0.58;
        const frameX = width * 0.5 - frameWidth * 0.5;
        const frameY = height * 0.52 - frameHeight * 0.5;

        frame.fillStyle(0x0c1220, 0.78);
        frame.fillRoundedRect(frameX, frameY, frameWidth, frameHeight, 14);
        frame.lineStyle(2, 0x2d3b5c, 0.9);
        frame.strokeRoundedRect(frameX, frameY, frameWidth, frameHeight, 14);
        frame.lineStyle(1, 0x1b2744, 0.9);
        for (let i = 1; i < 6; i += 1) {
            const y = frameY + (frameHeight / 6) * i;
            frame.strokeLineShape(new Phaser.Geom.Line(frameX + 16, y, frameX + frameWidth - 16, y));
        }
    }

    createFilters(width, height) {
        this.modeFilterText = this.add.text(width * 0.3, height * 0.27, '', {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        this.modeFilterText.setResolution(RENDER.textResolution);
        this.makeInteractive(this.modeFilterText, () => this.cycleModeFilter());

        this.difficultyFilterText = this.add.text(width * 0.7, height * 0.27, '', {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: PALETTE.uiText
        }).setOrigin(0.5);
        this.difficultyFilterText.setResolution(RENDER.textResolution);
        this.makeInteractive(this.difficultyFilterText, () => this.cycleDifficultyFilter());

        this.refreshFilterLabels();
    }

    createColumnHeaders(width, height) {
        const header = this.add.text(width * 0.5, height * 0.33,
            'RANK   NAME               SCORE     WAVES   KILLS  TIER MODE', {
                fontFamily: 'Courier New, monospace',
                fontSize: '14px',
                color: PALETTE.uiText,
                alpha: 0.8
            }).setOrigin(0.5);
        header.setResolution(RENDER.textResolution);
    }

    createEntryRows(width, height) {
        this.entriesOrigin = { x: width * 0.5, y: height * 0.39 };
        this.entryRows = [];
    }

    createStatusText(width, height) {
        this.statusText = this.add.text(width * 0.5, height * 0.78, '', {
            fontFamily: UI.fontFamily,
            fontSize: '12px',
            color: PALETTE.uiText,
            alpha: 0.7
        }).setOrigin(0.5);
        this.statusText.setResolution(RENDER.textResolution);

        const formulaText = this.add.text(width * 0.5, height * 0.74,
            'Score = Waves*100000 + Kills*10 + Tier*1000 + Time', {
                fontFamily: UI.fontFamily,
                fontSize: '11px',
                color: PALETTE.uiText,
                alpha: 0.45
            }).setOrigin(0.5);
        formulaText.setResolution(RENDER.textResolution);

        const legendText = this.add.text(width * 0.5, height * 0.705,
            '* marks your last submitted name', {
                fontFamily: UI.fontFamily,
                fontSize: '11px',
                color: PALETTE.uiText,
                alpha: 0.45
            }).setOrigin(0.5);
        legendText.setResolution(RENDER.textResolution);
    }

    createButtons(width, height) {
        const refreshText = this.add.text(width * 0.5, height * 0.82, 'REFRESH [R]', {
            fontFamily: UI.fontFamily,
            fontSize: '14px',
            color: PALETTE.warning
        }).setOrigin(0.5);
        refreshText.setResolution(RENDER.textResolution);
        this.makeInteractive(refreshText, () => this.loadHighscores(true));

        const backText = this.add.text(width * 0.5, height * 0.88, 'BACK [M]', {
            fontFamily: UI.fontFamily,
            fontSize: '16px',
            color: PALETTE.warning
        }).setOrigin(0.5);
        backText.setResolution(RENDER.textResolution);
        this.makeInteractive(backText, () => this.scene.start('MenuScene'));

        const lastName = getSavedHighscoreName();
        if (lastName) {
            const lastNameText = this.add.text(width * 0.5, height * 0.91,
                `Last name: ${escapeHighscoreName(lastName)}`, {
                    fontFamily: UI.fontFamily,
                    fontSize: '12px',
                    color: PALETTE.uiText,
                    alpha: 0.6
                }).setOrigin(0.5);
            lastNameText.setResolution(RENDER.textResolution);
        }
    }

    refreshFilterLabels() {
        const mode = MODE_FILTERS[this.modeFilterIndex];
        const modeLabel = mode === 'all' ? 'ALL' : mode.toUpperCase();
        this.modeFilterText.setText(`MODE: ${modeLabel}`);

        const difficulty = DIFFICULTY_FILTERS[this.difficultyFilterIndex];
        const diffLabel = difficulty === 'all' ? 'ALL' : difficulty.toUpperCase();
        this.difficultyFilterText.setText(`DIFFICULTY: ${diffLabel}`);
    }

    cycleModeFilter() {
        this.modeFilterIndex = (this.modeFilterIndex + 1) % MODE_FILTERS.length;
        this.refreshFilterLabels();
        this.renderEntries();
    }

    cycleDifficultyFilter() {
        this.difficultyFilterIndex = (this.difficultyFilterIndex + 1) % DIFFICULTY_FILTERS.length;
        this.refreshFilterLabels();
        this.renderEntries();
    }

    async loadHighscores(force = false) {
        if (!isRemoteHighscoreEnabled()) {
            this.setStatus('Highscores unavailable on this host.');
            return;
        }

        this.setStatus('Fetching scores...');
        const entries = force ? await fetchRemoteHighscoresForced() : await fetchRemoteHighscores();
        if (!this.isActiveScene) {
            return;
        }

        this.entries = entries || [];
        const error = getHighscoreLastError();
        if (!this.entries.length && error) {
            this.setStatus('No response from highscore server.');
        } else if (!this.entries.length) {
            this.setStatus('No highscores yet. Claim the top spot.');
        } else {
            this.setStatus(`Loaded ${this.entries.length} scores.`);
        }

        this.renderEntries();
    }

    renderEntries() {
        this.clearEntryRows();

        const filtered = this.applyFilters(this.entries);
        if (!filtered.length) {
            this.createEmptyRow();
            return;
        }

        const sorted = filtered.slice().sort((a, b) => b.score - a.score);
        const lastName = getSavedHighscoreName();
        const maxRows = 10;
        const colors = [PALETTE.warning, '#c0c0c0', '#cd7f32'];
        for (let index = 0; index < Math.min(sorted.length, maxRows); index += 1) {
            const entry = sorted[index];
            const rowY = this.entriesOrigin.y + index * 22;
            const isPlayer = lastName
                && entry.name
                && entry.name.toLowerCase() === lastName.toLowerCase();
            const baseColor = index < 3 ? colors[index] : PALETTE.uiText;
            const color = isPlayer ? '#00ff99' : baseColor;
            const alpha = index < 3 ? 0.95 : 0.8;
            const row = this.createRow(entry, index + 1, rowY, color, alpha, isPlayer);
            this.entryRows.push(row);
        }
    }

    applyFilters(entries) {
        const mode = MODE_FILTERS[this.modeFilterIndex];
        const difficulty = DIFFICULTY_FILTERS[this.difficultyFilterIndex];

        return entries.filter((entry) => {
            const modeMatch = mode === 'all'
                || (mode === 'classic' && !entry.endless)
                || (mode === 'endless' && entry.endless);
            const entryDifficulty = entry.difficulty || 'normal';
            const diffMatch = difficulty === 'all' || entryDifficulty === difficulty;
            return modeMatch && diffMatch;
        });
    }

    createRow(entry, rank, rowY, color, alpha, isPlayer) {
        const baseX = this.entriesOrigin.x;
        const safeName = escapeHighscoreName(entry.name);
        const name = safeName.length > 18 ? `${safeName.slice(0, 17)}.` : safeName;
        const score = formatHighscoreValue(entry.score);
        const waves = formatNumber(entry.wavesCleared, 0);
        const kills = formatNumber(entry.enemiesDestroyed, 0);
        const tier = String(entry.highestTier || 1);
        const modeTag = entry.endless ? 'END' : 'CLS';
        const rankLabel = `${isPlayer ? '*' : ' '}${rank.toString().padStart(2, '0')}`;

        const fontSize = rank <= 3 ? '18px' : '16px';
        const rowText = this.add.text(baseX, rowY,
            `${rankLabel}  ${name.padEnd(18, ' ')} ${score.padStart(7, ' ')}  W${waves.padStart(3, ' ')}   K${kills.padStart(4, ' ')}   T${tier.padStart(2, ' ')} ${modeTag}`, {
                fontFamily: 'Courier New, monospace',
                fontSize,
                color,
                alpha
            }).setOrigin(0.5, 0);
        rowText.setResolution(RENDER.textResolution);

        return [rowText];
    }

    createEmptyRow() {
        const rowText = this.add.text(this.entriesOrigin.x, this.entriesOrigin.y,
            '--- NO MATCHING SCORES ---', {
                fontFamily: 'Courier New, monospace',
                fontSize: '16px',
                color: PALETTE.uiText,
                alpha: 0.6
            }).setOrigin(0.5, 0);
        rowText.setResolution(RENDER.textResolution);
        this.entryRows.push([rowText]);
    }

    clearEntryRows() {
        if (!this.entryRows) {
            return;
        }
        this.entryRows.forEach((row) => {
            row.forEach((item) => item.destroy());
        });
        this.entryRows = [];
    }

    setStatus(text) {
        if (this.statusText) {
            this.statusText.setText(text || '');
        }
    }

    makeInteractive(textObj, callback) {
        textObj.setInteractive({ useHandCursor: true });

        textObj.on('pointerover', () => {
            textObj.setAlpha(0.7);
        });

        textObj.on('pointerout', () => {
            textObj.setAlpha(1);
        });

        textObj.on('pointerdown', callback);
    }
}
