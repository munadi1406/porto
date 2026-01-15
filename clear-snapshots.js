// Quick script to clear zero-value snapshots
// Run this in browser console if needed

async function clearZeroSnapshots() {
    const response = await fetch('/api/snapshots', {
        method: 'DELETE'
    });
    const result = await response.json();
    console.log('Cleared snapshots:', result);
    window.location.reload();
}

// Run it
clearZeroSnapshots();
