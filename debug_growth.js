// Run this in browser console to debug growth calculation

// 1. Check all history data
const history = JSON.parse(localStorage.getItem('portfolio_history'));
console.log('=== FULL HISTORY ===');
console.log('Total snapshots:', history?.length || 0);

if (history && history.length > 0) {
    console.log('First ever:', {
        date: new Date(history[0].timestamp).toLocaleString(),
        value: history[0].totalValue
    });
    console.log('Last ever:', {
        date: new Date(history[history.length - 1].timestamp).toLocaleString(),
        value: history[history.length - 1].totalValue
    });
}

// 2. Check week data
const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
const weekData = history?.filter(s => s.timestamp >= weekAgo).sort((a, b) => a.timestamp - b.timestamp) || [];

console.log('\n=== WEEK DATA (1M) ===');
console.log('Week snapshots:', weekData.length);

if (weekData.length > 0) {
    const first = weekData[0];
    const last = weekData[weekData.length - 1];
    const growth = last.totalValue - first.totalValue;
    const percent = (growth / first.totalValue * 100);

    console.log('First in week:', {
        date: new Date(first.timestamp).toLocaleString(),
        value: first.totalValue
    });
    console.log('Last in week:', {
        date: new Date(last.timestamp).toLocaleString(),
        value: last.totalValue
    });
    console.log('Growth:', {
        value: growth,
        percent: percent.toFixed(2) + '%'
    });
}

// 3. Check for data issues
console.log('\n=== DATA QUALITY ===');
const zeros = history?.filter(s => s.totalValue === 0).length || 0;
const duplicates = history?.filter((s, i, arr) => i > 0 && s.totalValue === arr[i - 1].totalValue).length || 0;

console.log('Zero values:', zeros);
console.log('Duplicate values:', duplicates);

// 4. Sample data points
console.log('\n=== SAMPLE DATA (Last 10) ===');
history?.slice(-10).forEach((s, i) => {
    console.log(`${i + 1}.`, {
        date: new Date(s.timestamp).toLocaleString('id-ID'),
        value: s.totalValue.toLocaleString('id-ID')
    });
});

// 5. OPTIONAL: Clear history (DESTRUCTIVE!)
// Uncomment to reset:
// localStorage.removeItem('portfolio_history');
// console.log('✅ History cleared! Refresh page to start fresh.');
