@echo off
setlocal enabledelayedexpansion

echo ======================================================
echo        THIET LAP CONG CU TAO CHUNG CHI TU DONG
echo ======================================================
echo.

:: 1. Kiem tra Python (hoac tim kiem o cac duong dan mac dinh)
echo [*] Dang kiem tra Python tren he thong...
where python >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\msys64\ucrt64\bin\python.exe" (
        set "SYS_PYTHON=C:\msys64\ucrt64\bin\python.exe"
        echo [+] Tim thay Python tai: C:\msys64\ucrt64\bin\python.exe
    ) else if exist "C:\msys64\mingw64\bin\python.exe" (
        set "SYS_PYTHON=C:\msys64\mingw64\bin\python.exe"
        echo [+] Tim thay Python tai: C:\msys64\mingw64\bin\python.exe
    ) else (
        echo [LOI] Khong tim thay Python! 
        echo Vui long tai va cai dat Python, dong thoi tick chon "Add Python to PATH".
        echo.
        pause
        exit /b 1
    )
) else (
    set "SYS_PYTHON=python"
)

:: 2. Tao moi truong ao .venv
echo [*] Dang khoi tao moi truong ao (.venv)...
%SYS_PYTHON% -m venv .venv --clear
if %errorlevel% neq 0 (
    echo [LOI] Khong the khoi tao moi truong ao .venv.
    pause
    exit /b 1
)

:: 3. Cai dat thu vien tu requirements.txt
echo [*] Dang cai dat cac thu vien can thiet...
if exist ".venv\Scripts\pip.exe" (
    .venv\Scripts\pip.exe install -r requirements.txt
) else (
    .venv\bin\pip.exe install -r requirements.txt
)

if %errorlevel% neq 0 (
    echo [CANH BAO] Cai dat bang pip co the gap loi. Dang tiep tuc thiet lap...
)

:: 4. Xac dinh duong dan Python ao
set "PYTHON_EXE=.venv\Scripts\python.exe"
if not exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\bin\python.exe"
)

:: 5. Tao lenh tat 'gen_cert' toan he thong
echo [*] Dang thiet lap lenh tat 'gen_cert' vao Windows...
set "SHORTCUT_PATH=%USERPROFILE%\AppData\Local\Microsoft\WindowsApps\gen_cert.bat"
set "PROJECT_DIR=%~dp0"

:: Bo ky tu backslash (\) o cuoi PROJECT_DIR neu co
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

:: Lay chu cai o dia (vd: C: hoac E:)
set "DRIVE=%PROJECT_DIR:~0,2%"

(
echo @echo off
echo %DRIVE%
echo cd "%PROJECT_DIR%"
echo "%PROJECT_DIR%\%PYTHON_EXE%" gen_cert.py %%*
) > "%SHORTCUT_PATH%"

echo.
echo ======================================================
echo [THANH CONG] Thiet lap hoan tat!
echo Bay gio ban hoac ban cua ban co the mo BAT KY terminal nao va go:
echo     gen_cert
echo de khoi chay chuong trinh tu bat ky dau!
echo ======================================================
echo.
pause
