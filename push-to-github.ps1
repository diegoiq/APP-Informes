param(
    [Parameter(Mandatory=$false)]
    [string]$Token
)

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Script de Forzar Push a GitHub - APP-Informes     " -ForegroundColor Cyan
Write-Host "  Repositorio: diegoiq/APP-Informes.git             " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Verificar estado de git
Write-Host "`n[1/4] Verificando archivos locales..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "Detectados cambios sin comitear. Añadiendo y comiteando..." -ForegroundColor Gray
    git add .
    git commit -m "chore: actualizacion de codigo y configuracion operativa"
} else {
    Write-Host "Arbol de trabajo limpio y listo para push." -ForegroundColor Green
}

# 2. Obtener Token si no fue pasado por parámetro
if (-not $Token) {
    Write-Host "`n[2/4] Autenticacion GitHub:" -ForegroundColor Yellow
    Write-Host "Para evitar el conflicto con la cuenta de Windows (musicparty-1)," -ForegroundColor Gray
    Write-Host "ingresa tu Personal Access Token (PAT) de la cuenta 'diegoiq'." -ForegroundColor Gray
    $Token = Read-Host "GitHub Personal Access Token (ej: ghp_...)"
}

if (-not $Token -or $Token.Trim() -eq "") {
    Write-Host "`nNo se ingreso token. Intentando push forzado directo..." -ForegroundColor Yellow
    git push --force -u origin main
} else {
    $TokenClean = $Token.Trim()
    $RemoteUrlWithAuth = "https://${TokenClean}@github.com/diegoiq/APP-Informes.git"
    $CleanUrl = "https://github.com/diegoiq/APP-Informes.git"

    Write-Host "`n[3/4] Autenticando con GitHub Token..." -ForegroundColor Yellow
    git remote set-url origin $RemoteUrlWithAuth

    Write-Host "`n[4/4] Ejecutando Git Push Forzado a rama 'main'..." -ForegroundColor Yellow
    try {
        git push --force -u origin main
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n====================================================" -ForegroundColor Green
            Write-Host "  EXITO: PUSH FORZADO COMPLETADO EN GITHUB          " -ForegroundColor Green
            Write-Host "  Repositorio: https://github.com/diegoiq/APP-Informes" -ForegroundColor Green
            Write-Host "====================================================" -ForegroundColor Green
        } else {
            Write-Host "`nError durante el push. Codigo de salida: $LASTEXITCODE" -ForegroundColor Red
        }
    } finally {
        # Por seguridad, restauramos la URL limpia para que el token no quede guardado en .git/config
        Write-Host "`nProtegiendo credenciales: Restaurando URL remota limpia..." -ForegroundColor Gray
        git remote set-url origin $CleanUrl
    }
}
