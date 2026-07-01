@echo off
echo Installing PyInstaller and dependencies...
"C:\Users\Sento Eclipsen\AppData\Local\Python\pythoncore-3.14-64\python.exe" -m pip install -r requirements.txt

echo.
echo Building Standalone Executable...
"C:\Users\Sento Eclipsen\AppData\Local\Python\pythoncore-3.14-64\python.exe" -m PyInstaller ^
    --onefile ^
    --name Generator ^
    --add-data ".fonts;." ^
    --add-data "Template.png;." ^
    --add-data "PDTemplate.png;." ^
    generate_certificates.py

echo.
echo Build Complete!
echo You can find your final 'Generator.exe' inside the 'dist' folder.
echo You can safely send 'Generator.exe' to your clients.
pause
