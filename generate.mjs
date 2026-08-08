import fs from 'node:fs/promises';
import path from 'node:path';

const username = 'Shambhavichaudhary';
const theme = process.argv[2] === 'light' ? 'light' : 'dark';

const baseColors = {
  dark: {
    bg: '#0a0d12',
    panel: '#11171e',
    panelAlt: '#141c22',
    gridBase: '#1b232b',
    gridLine: '#222d38',
    text: '#f7f0f3',
    textSoft: '#d8b7c1',
    accent: '#ef6a7d',
    accentSoft: '#ff93a5',
    accentDark: '#8f3245',
    glow: '#ffb1bf',
    cell0: '#1b232b',
    cell1: '#2a1c27',
    cell2: '#4a2134',
    cell3: '#7b2d42',
    cell4: '#d96073'
  },
  light: {
    bg: '#f6f0f1',
    panel: '#fff8f9',
    panelAlt: '#f5eaee',
    gridBase: '#efe4e7',
    gridLine: '#e4d0d7',
    text: '#1d1d1d',
    textSoft: '#5d3b46',
    accent: '#b34a5d',
    accentSoft: '#df6a7d',
    accentDark: '#7a2b3e',
    glow: '#8c394d',
    cell0: '#f0eff0',
    cell1: '#f4dfe5',
    cell2: '#efbac8',
    cell3: '#e58aa0',
    cell4: '#d35d74'
  }
};

function isoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function parseContributionCount(tipText) {
  const match = tipText.match(/(\d+)\s+contributions?/i);
  if (match) return Number(match[1]);
  return 0;
}

async function getContributionData() {
  const url = `https://github.com/users/${username}/contributions`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub data: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();

  const matches = [
    ...html.matchAll(
      /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"[\s\S]{0,400}?<tool-tip[^>]*>([^<]*)<\/tool-tip>/g
    )
  ];
  if (!matches.length) {
    throw new Error('No contribution cells found in GitHub HTML output.');
  }

  const values = matches.map((match) => ({
    date: match[1],
    level: Number(match[2]),
    count: parseContributionCount(match[3])
  }));

  const ordered = values.sort((a, b) => a.date.localeCompare(b.date));
  const start = new Date(`${ordered[0].date}T00:00:00Z`);
  const end = new Date(`${ordered[ordered.length - 1].date}T00:00:00Z`);

  const startAligned = new Date(start);
  startAligned.setUTCDate(startAligned.getUTCDate() - startAligned.getUTCDay());

  const endAligned = new Date(end);
  endAligned.setUTCDate(endAligned.getUTCDate() + (6 - endAligned.getUTCDay()));

  const contributionByDate = new Map(ordered.map((item) => [item.date, item]));
  const cells = [];

  for (let current = new Date(startAligned); current <= endAligned; current.setUTCDate(current.getUTCDate() + 1)) {
    const dateKey = isoDate(current);
    const hit = contributionByDate.get(dateKey);
    cells.push({ date: dateKey, level: hit?.level ?? 0, count: hit?.count ?? 0 });
  }

  const totalCommits = cells.reduce((sum, cell) => sum + cell.count, 0);
  return { cells, startAligned, endAligned, totalCommits };
}

function buildGrid(cells, startAligned, endAligned) {
  const totalDays = Math.round((endAligned.getTime() - startAligned.getTime()) / 86400000) + 1;
  const colCount = Math.ceil(totalDays / 7);
  const rowCount = 7;

  const positions = [];
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    const date = new Date(`${cell.date}T00:00:00Z`);
    const offsetDays = Math.round((date.getTime() - startAligned.getTime()) / 86400000);
    const col = Math.floor(offsetDays / 7);
    const row = date.getUTCDay();
    positions.push({ ...cell, col, row, x: 24 + col * 13, y: 34 + row * 13 });
  }

  return { colCount, rowCount, positions };
}

function flameColor(themeName) {
  return themeName === 'dark' ? '#ffbb5f' : '#d45a72';
}

function generateSnakeSvg(themeName, colors) {
  const width = 760;
  const height = 170;
  const path = 'M 24 118 C 90 118, 120 68, 160 90 S 234 150, 300 118 S 372 70, 430 112 S 499 146, 570 104 S 640 82, 734 110';
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
    <title id="title">Shambhavichaudhary learning trail</title>
    <desc id="desc">A subtle snake-like contribution path showing the journey of learning and building.</desc>
    <rect width="100%" height="100%" fill="${colors.panel}" rx="18"/>
    <g opacity="0.16">
      ${Array.from({ length: 12 }, (_, i) => `
        <line x1="${30 + i * 58}" y1="20" x2="${30 + i * 58}" y2="150" stroke="${colors.gridLine}" stroke-width="1"/>
      `).join('')}
      ${Array.from({ length: 7 }, (_, i) => `
        <line x1="20" y1="${28 + i * 18}" x2="740" y2="${28 + i * 18}" stroke="${colors.gridLine}" stroke-width="1"/>
      `).join('')}
    </g>
    <path d="${path}" fill="none" stroke="${colors.accentSoft}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
    <path d="${path}" fill="none" stroke="${colors.text}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 10" opacity="0.75">
      <animate attributeName="stroke-dashoffset" values="0; -120" dur="7s" repeatCount="indefinite"/>
    </path>
    <g>
      ${Array.from({ length: 16 }, (_, i) => {
        const x = 34 + i * 42;
        const y = 120 - (i % 4) * 12 + (i % 2 === 0 ? 8 : -6);
        return `<circle cx="${x}" cy="${y}" r="${i % 2 === 0 ? 4.5 : 3.8}" fill="${colors.accent}" opacity="${0.5 + (i % 5) * 0.08}"/>`;
      }).join('')}
    </g>
    <text x="26" y="26" fill="${colors.textSoft}" font-size="10" font-family="Segoe UI, Arial, sans-serif" letter-spacing="2">LEARNING TRAIL / BUILD-FLOW</text>
  </svg>
  `;
}

async function getGitHubApiData() {
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  const user = await fetch(`https://api.github.com/users/${username}`, { headers });
  const repos = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers });

  if (!user.ok || !repos.ok) {
    throw new Error('GitHub API request failed.');
  }

  const userData = await user.json();
  const repoList = await repos.json();

  const langTotals = {};
  for (const repo of repoList) {
    if (!repo.fork) {
      const langResponse = await fetch(`https://api.github.com/repos/${username}/${repo.name}/languages`, { headers });
      if (langResponse.ok) {
        const langData = await langResponse.json();
        for (const [lang, value] of Object.entries(langData)) {
          langTotals[lang] = (langTotals[lang] || 0) + value;
        }
      }
    }
  }

  const topLanguages = Object.entries(langTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const contributionData = await getContributionData();

  return {
    user: userData,
    repoCount: repoList.length,
    topLanguages,
    activeDays: contributionData.cells.filter((cell) => cell.level > 0).length
  };
}

function generateAnalyticsCard({ themeName, colors, title, headline, metricLines, subtitle }) {
  const width = 760;
  const height = 200;
  const rows = metricLines
    .map((item, index) => {
      const x = 80 + index * 175;
      const value = item.value;
      return `
        <g>
          <text x="${x}" y="70" fill="${colors.textSoft}" font-size="12" font-family="Segoe UI, Arial, sans-serif" letter-spacing="1.5">${item.label}</text>
          <text x="${x}" y="108" fill="${colors.text}" font-size="30" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${value}</text>
          <rect x="${x - 2}" y="125" width="125" height="2" fill="${colors.accentSoft}" opacity="0.7"/>
        </g>
      `;
    })
    .join('');

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
    <title id="title">${title}</title>
    <desc id="desc">${subtitle}</desc>
    <rect width="100%" height="100%" rx="18" fill="${colors.panel}"/>
    <rect x="18" y="18" width="724" height="164" rx="16" fill="${colors.panelAlt}" stroke="${colors.gridLine}"/>
    <text x="36" y="52" fill="${colors.accentSoft}" font-size="12" font-family="Segoe UI, Arial, sans-serif" letter-spacing="2">GITHUB ANALYTICS</text>
    <text x="36" y="84" fill="${colors.text}" font-size="28" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${headline}</text>
    ${rows}
  </svg>
  `;
}

function generateLanguageCard({ themeName, colors, languages }) {
  const width = 760;
  const height = 210;
  const total = languages.reduce((sum, [, value]) => sum + value, 0) || 1;

  const bars = languages
    .map(([lang, value], index) => {
      const widthPx = (value / total) * 560;
      const x = 150;
      const y = 72 + index * 26;
      const fill = ['#ef6a7d', '#ff93a5', '#d35d74', '#e58aa0', '#b34a5d', '#efbac8'][index % 6];
      const pct = ((value / total) * 100).toFixed(1);
      return `
        <g>
          <text x="28" y="${y + 6}" fill="${colors.text}" font-size="12" font-family="Segoe UI, Arial, sans-serif">${lang}</text>
          <rect x="${x}" y="${y - 2}" width="560" height="16" rx="8" fill="${colors.gridBase}"/>
          <rect x="${x}" y="${y - 2}" width="${widthPx}" height="16" rx="8" fill="${fill}"/>
          <text x="${x + 570}" y="${y + 6}" fill="${colors.textSoft}" font-size="11" font-family="Segoe UI, Arial, sans-serif">${pct}%</text>
        </g>
      `;
    })
    .join('');

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
    <title id="title">Top languages</title>
    <desc id="desc">Top programming languages used across Shambhavichaudhary repositories.</desc>
    <rect width="100%" height="100%" rx="18" fill="${colors.panel}"/>
    <rect x="18" y="18" width="724" height="174" rx="16" fill="${colors.panelAlt}" stroke="${colors.gridLine}"/>
    <text x="36" y="52" fill="${colors.accentSoft}" font-size="12" font-family="Segoe UI, Arial, sans-serif" letter-spacing="2">LANGUAGE STACK</text>
    <text x="36" y="84" fill="${colors.text}" font-size="28" font-weight="700" font-family="Segoe UI, Arial, sans-serif">Top languages</text>
    ${bars}
  </svg>
  `;
}

function fighterPlaneMarkup(colors, themeName, { scale = 1 } = {}) {
  const metal = themeName === 'dark' ? '#f7f0f3' : '#2a1520';
  const canopy = themeName === 'dark' ? '#7ec8ff' : '#3a6f9a';
  const stripe = colors.accent;
  const exhaust = flameColor(themeName);
  return `
    <g transform="scale(${scale})">
      <ellipse cx="-18" cy="0" rx="11" ry="4" fill="${exhaust}" opacity="0.75"/>
      <path d="M -12 0 L -24 -3.5 L -32 0 L -24 3.5 Z" fill="${exhaust}" opacity="0.95"/>
      <path d="M -12 -1.2 L -17 -8 L -8 -2 Z" fill="${metal}"/>
      <path d="M -12 1.2 L -17 8 L -8 2 Z" fill="${metal}"/>
      <path d="M -1 0 L -9 -13 L 6 -3.2 Z" fill="${metal}"/>
      <path d="M -1 0 L -9 13 L 6 3.2 Z" fill="${metal}"/>
      <path d="M -1 0 L -9 -13 L 6 -3.2 Z" fill="${stripe}" opacity="0.35"/>
      <path d="M -1 0 L -9 13 L 6 3.2 Z" fill="${stripe}" opacity="0.35"/>
      <path d="M -15 0 L -9 -3.6 L 12 -2.4 L 20 0 L 12 2.4 L -9 3.6 Z" fill="${metal}"/>
      <path d="M -6 0 L 14 0" stroke="${stripe}" stroke-width="1.8"/>
      <path d="M 14 -2 L 24 0 L 14 2 Z" fill="${colors.accentSoft}"/>
      <circle cx="21" cy="0" r="1.3" fill="${colors.glow}"/>
      <ellipse cx="5" cy="-0.3" rx="5" ry="2" fill="${canopy}" opacity="0.95"/>
      <rect x="-5" y="-11.5" width="6.5" height="1.6" rx="0.7" fill="${colors.accentSoft}"/>
      <rect x="-5" y="9.9" width="6.5" height="1.6" rx="0.7" fill="${colors.accentSoft}"/>
    </g>
  `;
}

function hitIntensity(count) {
  if (count >= 6) return { ring: 18, stroke: 2.4, font: 14, rise: 28 };
  if (count >= 3) return { ring: 14, stroke: 1.8, font: 12, rise: 22 };
  return { ring: 11, stroke: 1.3, font: 10, rise: 16 };
}

function buildMission(targets, width, bottomY) {
  const start = { x: Math.round(width / 2), y: bottomY };
  const points = [start];

  for (const target of targets) {
    const cx = target.x + 4.5;
    const cy = target.y + 4.5;
    // approach from below the cell, then lock onto center
    points.push({ x: cx, y: Math.min(bottomY - 8, cy + 22) });
    points.push({ x: cx, y: cy });
  }

  points.push(start);

  const d = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  // each target uses 2 path segments (approach + lock); +1 return
  const segments = targets.length * 2 + 1;
  const hitFractions = targets.map((_, index) => Number(((index * 2 + 2) / segments).toFixed(4)));

  return { d, start, segments, hitFractions };
}

function generateSvg({ cells, startAligned, endAligned, themeName, colors }) {
  const { colCount, positions } = buildGrid(cells, startAligned, endAligned);
  const width = Math.max(760, 34 + colCount * 13 + 32);
  const height = 236;
  const bottomY = 200;

  const targets = positions
    .filter((cell) => cell.count > 0)
    .sort((a, b) => b.count - a.count || a.date.localeCompare(b.date));

  const activeDays = targets.length;
  const mission = buildMission(targets, width, bottomY);
  const cycleDur = Math.max(14, targets.length * 2.8);

  let running = 0;
  const scoreSteps = targets.map((target, index) => {
    running += target.count;
    return {
      score: running,
      hitAt: mission.hitFractions[index],
      nextAt: mission.hitFractions[index + 1] ?? 1
    };
  });

  const cellMarkup = positions
    .map((cell) => {
      const fill = colors[`cell${Math.min(4, cell.level)}`];
      const label =
        cell.count > 0
          ? `${cell.count} contribution${cell.count === 1 ? '' : 's'} on ${cell.date}`
          : `No contributions on ${cell.date}`;
      const isTarget = cell.count > 0;
      const targetIndex = isTarget ? targets.findIndex((item) => item.date === cell.date) : -1;
      const intensity = isTarget ? hitIntensity(cell.count) : null;
      const hitAt = targetIndex >= 0 ? mission.hitFractions[targetIndex] : 0;
      const hitEnd = Math.min(1, hitAt + 0.06);

      const hitFx =
        targetIndex >= 0
          ? `
          <circle cx="${cell.x + 4.5}" cy="${cell.y + 4.5}" r="4" fill="none" stroke="${colors.accentSoft}" stroke-width="${intensity.stroke}" opacity="0">
            <animate attributeName="r" values="4;${intensity.ring};${intensity.ring}" keyTimes="0;${hitAt};${hitEnd}" dur="${cycleDur}s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;${Math.max(0, hitAt - 0.01)};${hitAt};${hitEnd};1" dur="${cycleDur}s" repeatCount="indefinite"/>
          </circle>
          <rect x="${cell.x - 1.5}" y="${cell.y - 1.5}" width="12" height="12" rx="3" fill="none" stroke="${colors.glow}" stroke-width="1.5" opacity="0">
            <animate attributeName="opacity" values="0;0;1;0.35;0;0" keyTimes="0;${Math.max(0, hitAt - 0.005)};${hitAt};${hitEnd};${Math.min(1, hitEnd + 0.04)};1" dur="${cycleDur}s" repeatCount="indefinite"/>
          </rect>`
          : '';

      return `
        <g aria-label="${label}">
          <rect x="${cell.x}" y="${cell.y}" width="9" height="9" rx="2.2" fill="${fill}" stroke="${isTarget ? colors.accentDark : colors.gridLine}" opacity="${cell.level === 0 ? 0.42 : 0.96}">
            ${
              targetIndex >= 0
                ? `<animate attributeName="opacity" values="0.96;0.96;1;0.96;0.96" keyTimes="0;${Math.max(0, hitAt - 0.01)};${hitAt};${hitEnd};1" dur="${cycleDur}s" repeatCount="indefinite"/>`
                : ''
            }
          </rect>
          ${hitFx}
        </g>
      `;
    })
    .join('');

  const popups = targets
    .map((target, index) => {
      const cx = target.x + 4.5;
      const cy = target.y + 4.5;
      const hitAt = mission.hitFractions[index];
      const fadeStart = Math.min(1, hitAt + 0.04);
      const fadeEnd = Math.min(1, hitAt + 0.12);
      const intensity = hitIntensity(target.count);
      return `
        <text x="${cx}" y="${cy}" text-anchor="middle" fill="${colors.accentSoft}" font-size="${intensity.font}" font-weight="700" font-family="Segoe UI, Arial, sans-serif" opacity="0">+${target.count}
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${hitAt};${Math.min(1, hitAt + 0.01)};${fadeStart};${fadeEnd};1" dur="${cycleDur}s" repeatCount="indefinite"/>
          <animate attributeName="y" values="${cy};${cy};${cy};${cy - intensity.rise * 0.45};${cy - intensity.rise};${cy - intensity.rise}" keyTimes="0;${hitAt};${Math.min(1, hitAt + 0.01)};${fadeStart};${fadeEnd};1" dur="${cycleDur}s" repeatCount="indefinite"/>
        </text>
      `;
    })
    .join('');

  const scoreTexts = [
    `<text x="${width - 108}" y="42" fill="${colors.accentSoft}" font-size="20" font-weight="700" font-family="Segoe UI, Arial, sans-serif" opacity="1">0
      <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;${mission.hitFractions[0] ?? 1};${Math.min(1, (mission.hitFractions[0] ?? 1) + 0.001)};1" dur="${cycleDur}s" repeatCount="indefinite"/>
    </text>`
  ];

  for (let i = 0; i < scoreSteps.length; i += 1) {
    const step = scoreSteps[i];
    const showStart = step.hitAt;
    const showEnd = step.nextAt;
    scoreTexts.push(`
      <text x="${width - 108}" y="42" fill="${colors.accentSoft}" font-size="20" font-weight="700" font-family="Segoe UI, Arial, sans-serif" opacity="0">${step.score}
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${showStart};${Math.min(1, showStart + 0.001)};${showEnd};${Math.min(1, showEnd + 0.001)};1" dur="${cycleDur}s" repeatCount="indefinite"/>
      </text>
    `);
  }

  const muzzleFlashes = targets
    .map((target, index) => {
      const cx = target.x + 4.5;
      const cy = target.y + 4.5;
      const hitAt = mission.hitFractions[index];
      const done = Math.min(1, hitAt + 0.035);
      return `
        <line x1="${cx}" y1="${cy + 14}" x2="${cx}" y2="${cy + 3}" stroke="${colors.glow}" stroke-width="2" stroke-linecap="round" opacity="0">
          <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;${Math.max(0, hitAt - 0.015)};${hitAt};${done};1" dur="${cycleDur}s" repeatCount="indefinite"/>
        </line>
        <circle cx="${cx}" cy="${cy}" r="2.5" fill="${colors.text}" opacity="0">
          <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;${hitAt};${Math.min(1, hitAt + 0.008)};${done};1" dur="${cycleDur}s" repeatCount="indefinite"/>
          <animate attributeName="r" values="1;1;5;2;2" keyTimes="0;${hitAt};${Math.min(1, hitAt + 0.01)};${done};1" dur="${cycleDur}s" repeatCount="indefinite"/>
        </circle>
      `;
    })
    .join('');

  const markup = `
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
    <title id="title">Shambhavichaudhary GitHub contribution jet heatmap</title>
    <desc id="desc">Arcade jet targets real GitHub contribution cells, pops +commit scores, and accumulates TOTAL POINTS.</desc>
    <defs>
      <linearGradient id="bgGlow" x1="0" x2="1">
        <stop offset="0%" stop-color="${colors.panelAlt}"/>
        <stop offset="100%" stop-color="${colors.bg}"/>
      </linearGradient>
      <filter id="shadow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="${colors.accentSoft}" flood-opacity="0.7"/>
      </filter>
    </defs>

    <rect width="100%" height="100%" fill="url(#bgGlow)" rx="22"/>

    <g>
      <rect x="10" y="10" width="${width - 20}" height="216" rx="20" fill="${colors.panel}" stroke="${colors.gridLine}"/>
      <text x="24" y="28" fill="${colors.textSoft}" font-size="10" font-family="Segoe UI, Arial, sans-serif" letter-spacing="2">GITHUB ACTIVITY / CORE FLIGHT PATH</text>

      <rect x="${width - 188}" y="14" width="162" height="38" rx="9" fill="${colors.panelAlt}" stroke="${colors.accent}" stroke-width="1.6"/>
      <text x="${width - 176}" y="30" fill="${colors.textSoft}" font-size="8" font-family="Segoe UI, Arial, sans-serif" letter-spacing="1.4">TOTAL POINTS</text>
      <text x="${width - 176}" y="44" fill="${colors.textSoft}" font-size="8" font-family="Segoe UI, Arial, sans-serif" letter-spacing="1.2">COMMITS</text>
      ${scoreTexts.join('')}
    </g>

    <g>
      ${cellMarkup}
    </g>

    <!-- mission path is target-driven (invisible gameplay rail) -->
    <path id="missionTrack" d="${mission.d}" fill="none" stroke="${colors.accentSoft}" stroke-width="1.2" stroke-dasharray="3 7" opacity="0.18"/>

    <g>
      ${muzzleFlashes}
      ${popups}
    </g>

    <g filter="url(#shadow)">
      <g>
        ${fighterPlaneMarkup(colors, themeName, { scale: 0.92 })}
        <animateMotion dur="${cycleDur}s" repeatCount="indefinite" rotate="auto" calcMode="linear">
          <mpath xlink:href="#missionTrack" href="#missionTrack"/>
        </animateMotion>
      </g>
    </g>

    <g opacity="0.85">
      <text x="24" y="214" fill="${colors.textSoft}" font-size="10" font-family="Segoe UI, Arial, sans-serif">${username} · ${activeDays} targets · arcade lock-on</text>
      <text x="${width - 168}" y="214" fill="${colors.textSoft}" font-size="10" font-family="Segoe UI, Arial, sans-serif">flight signal: ${themeName.toUpperCase()}</text>
    </g>
  </svg>
  `;

  return markup;
}

async function main() {
  const { cells, startAligned, endAligned } = await getContributionData();
  const svg = generateSvg({
    cells,
    startAligned,
    endAligned,
    themeName: theme,
    colors: baseColors[theme]
  });
  const stats = await getGitHubApiData();
  const snakeSvg = generateSnakeSvg(theme, baseColors[theme]);
  const statsCard = generateAnalyticsCard({
    themeName: theme,
    colors: baseColors[theme],
    title: 'GitHub stats for Shambhavi Chaudhary',
    headline: 'Profile overview',
    metricLines: [
      { label: 'repos', value: String(stats.repoCount) },
      { label: 'followers', value: String(stats.user.followers) },
      { label: 'following', value: String(stats.user.following) },
      { label: 'active days', value: String(stats.activeDays) }
    ],
    subtitle: 'Summary of public GitHub activity and profile metrics.'
  });

  const languagesCard = generateLanguageCard({
    themeName: theme,
    colors: baseColors[theme],
    languages: stats.topLanguages
  });

  const outDir = path.join(process.cwd(), 'assets');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, `jet-heatmap-${theme}.svg`), svg.trim(), 'utf8');
  await fs.writeFile(path.join(outDir, `snake-trail-${theme}.svg`), snakeSvg.trim(), 'utf8');
  await fs.writeFile(path.join(outDir, `github-stats-${theme}.svg`), statsCard.trim(), 'utf8');
  await fs.writeFile(path.join(outDir, `top-languages-${theme}.svg`), languagesCard.trim(), 'utf8');
  console.log(`Generated ${theme} SVG at ${path.join(outDir, `jet-heatmap-${theme}.svg`)}`);
  console.log(`Generated ${theme} snake at ${path.join(outDir, `snake-trail-${theme}.svg`)}`);
  console.log(`Generated ${theme} stats at ${path.join(outDir, `github-stats-${theme}.svg`)}`);
  console.log(`Generated ${theme} languages at ${path.join(outDir, `top-languages-${theme}.svg`)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
