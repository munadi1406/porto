# Fix script for PerformanceMetrics.tsx
$path = 'D:\qna\porto\src\components\PerformanceMetrics.tsx'
$content = Get-Content $path -Raw

$replacements = @(
    @{'old'='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700';'new'='bg-card p-6 rounded-2xl border-border'},
    @{'old'='text-gray-900 dark:text-white';'new'='text-foreground'},
    @{'old'='text-sm text-gray-500';'new'='text-sm text-muted-foreground'},
    @{'old'='bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700';'new'='bg-card p-4 sm:p-6 rounded-2xl shadow-sm border-border'}
)

foreach($r in $replacements) {
    $content = $content -replace [regex]::Escape($r.old), $r.new
}

Set-Content $path $content
Write-Host 'Done'
