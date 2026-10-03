/**
 * Combined Constants, Helpers & Analytics Charts Module
 */

// --- CONSTANTS & CONFIGURATION ---
export const API_PATHS = {
    CLAN_INFO: './data/clan_stats/clan_info.json',
    MEMBER_DETAIL: (cleanTag) => `./data/members/${cleanTag}.json`
};

export const ROLE_LABELS = {
    leader: 'Leader',
    coLeader: 'Co-Leader',
    admin: 'Elder',
    member: 'Member'
};

/**
 * Helper function untuk memformat/parse tanggal dari API CoC (ISO/CoC format)
 */
export function parseCoCDate(cocDateString) {
    if (!cocDateString) return new Date();
    
    const year = cocDateString.substring(0, 4);
    const month = cocDateString.substring(4, 6) - 1;
    const day = cocDateString.substring(6, 8);
    const hours = cocDateString.substring(9, 11) || 0;
    const minutes = cocDateString.substring(11, 13) || 0;
    const seconds = cocDateString.substring(13, 15) || 0;

    return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}


// --- MEMBER STATS AGGREGATIONS ---

/**
 * Memproses distribusi Town Hall anggota clan
 */
export function getTownHallDistribution(members) {
    if (!Array.isArray(members)) return {};

    return members.reduce((acc, member) => {
        const th = member.townHallLevel || 'Unknown';
        acc[th] = (acc[th] || 0) + 1;
        return acc;
    }, {});
}

/**
 * Memproses distribusi Jabatan (Role) anggota clan
 */
export function getRoleDistribution(members) {
    if (!Array.isArray(members)) return {};

    return members.reduce((acc, member) => {
        const role = member.role || 'Unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
    }, {});
}


// --- WAR ANALYTICS & CHARTS ---

let efficiencyChart = null; 

/**
 * Filter riwayat war berdasarkan rentang waktu
 */
function filterHistoryByRange(warHistory, range) {
    if (range === 'all') return warHistory;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return warHistory.filter(war => {
        if (!war.endTime) return true;
        const warDate = parseCoCDate(war.endTime);
        return warDate.getMonth() === currentMonth && warDate.getFullYear() === currentYear;
    });
}

/**
 * Main export function untuk render semua chart war & tabel
 */
export function renderCharts(warHistory, range = 'month') {
    if (!warHistory || warHistory.length === 0) return;

    const filteredHistory = filterHistoryByRange(warHistory, range);
    
    renderTopPerformers(filteredHistory);
    renderEfficiencyChart(filteredHistory);
}

function renderTopPerformers(warHistory) {
    const container = document.getElementById('topPerformersContainer');
    if (!container) return;
    
    const statsMap = {}; 
    warHistory.forEach(war => {
        if (!war.clan || !war.clan.members) return;
        war.clan.members.forEach(m => {
            if (!statsMap[m.tag]) statsMap[m.tag] = { name: m.name, s3: 0, s2: 0, s1: 0, s0: 0, totalStars: 0 };
            (m.attacks || []).forEach(atk => {
                statsMap[m.tag].totalStars += atk.stars;
                if (atk.stars === 3) statsMap[m.tag].s3++;
                else if (atk.stars === 2) statsMap[m.tag].s2++;
                else if (atk.stars === 1) statsMap[m.tag].s1++;
                else statsMap[m.tag].s0++;
            });
        });
    });

    const topPerformers = Object.values(statsMap)
        .filter(p => (p.s3 + p.s2 + p.s1 + p.s0) > 0)
        .sort((a, b) => b.totalStars - a.totalStars || b.s3 - a.s3)
        .slice(0, 25);

    if (topPerformers.length === 0) {
        container.innerHTML = `<p class="text-center text-neutral-500 py-10 text-[10px]">No attack data for this range.</p>`;
        return;
    }

    let html = `<table class="w-full text-[10px] text-left border-collapse">
        <thead>
            <tr class="border-b border-neutral-800 text-neutral-400 uppercase font-bold">
                <th class="py-2 pl-1">Player</th>
                <th class="py-2 text-center text-emerald-500">3★</th>
                <th class="py-2 text-center text-amber-500">2★</th>
                <th class="py-2 text-center text-rose-500">1★</th>
                <th class="py-2 text-center text-neutral-500">0★</th>
                <th class="py-2 text-right pr-1 text-amber-400">Total</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-neutral-800/40">`;

    topPerformers.forEach(p => {
        html += `<tr class="hover:bg-neutral-800/30 transition-colors">
            <td class="py-2 pl-1 font-bold text-neutral-200">${p.name}</td>
            <td class="py-2 text-center font-mono text-emerald-400">${p.s3}</td>
            <td class="py-2 text-center font-mono text-amber-400">${p.s2}</td>
            <td class="py-2 text-center font-mono text-rose-400">${p.s1}</td>
            <td class="py-2 text-center font-mono text-neutral-500">${p.s0}</td>
            <td class="py-2 text-right pr-1 font-bold text-amber-400">${p.totalStars}</td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

function renderEfficiencyChart(warHistory) {
    const canvas = document.getElementById('efficiencyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const statsMap = {}; 

    warHistory.forEach(war => {
        if (!war.clan || !war.clan.members) return;
        war.clan.members.forEach(m => {
            if (!statsMap[m.tag]) statsMap[m.tag] = { name: m.name, s3: 0, s2: 0, s1: 0, s0: 0, total: 0 };
            (m.attacks || []).forEach(atk => {
                statsMap[m.tag].total++;
                if (atk.stars === 3) statsMap[m.tag].s3++;
                else if (atk.stars === 2) statsMap[m.tag].s2++;
                else if (atk.stars === 1) statsMap[m.tag].s1++;
                else statsMap[m.tag].s0++;
            });
        });
    });

    // Menyiapkan Top 25 pemain
    const top25 = Object.values(statsMap)
        .filter(p => p.total > 0)
        .sort((a, b) => b.total - a.total || b.s3 - a.s3)
        .slice(0, 25);

    if (top25.length === 0) return;

    // Membuat variabel labels & datasets yang sebelumnya hilang
    const labels = top25.map(p => p.name);
    const datasets = [
        {
            label: '3 Star %',
            data: top25.map(p => Math.round((p.s3 / p.total) * 100)),
            backgroundColor: '#10b981' // emerald-500
        },
        {
            label: '2 Star %',
            data: top25.map(p => Math.round((p.s2 / p.total) * 100)),
            backgroundColor: '#f59e0b' // amber-500
        },
        {
            label: '1 Star %',
            data: top25.map(p => Math.round((p.s1 / p.total) * 100)),
            backgroundColor: '#f43f5e' // rose-500
        },
        {
            label: '0 Star %',
            data: top25.map(p => Math.round((p.s0 / p.total) * 100)),
            backgroundColor: '#525252' // neutral-600
        }
    ];

    if (efficiencyChart) efficiencyChart.destroy();
    
    efficiencyChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            indexAxis: 'y', 
            responsive: true, 
            maintainAspectRatio: false,
            scales: {
                x: { 
                    stacked: true, 
                    beginAtZero: true, 
                    max: 100, 
                    grid: { color: '#262626' }, 
                    ticks: { color: '#a3a3a3', font: { size: 9 }, callback: (v) => v + '%' } 
                },
                y: { 
                    stacked: true, 
                    grid: { display: false }, 
                    ticks: { color: '#e5e5e5', font: { size: 10, weight: 'bold' } } 
                }
            },
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { color: '#a3a3a3', font: { size: 9 }, boxWidth: 10, padding: 15 } 
                },
                tooltip: { 
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%` } 
                }
            }
        }
    });

    const container = document.getElementById('efficiencyContainer');
    if (container) container.style.height = `${top25.length * 28 + 60}px`;
}
