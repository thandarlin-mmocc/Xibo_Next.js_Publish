@echo off
REM Kiosk launcher - opens the shared /player web page fullscreen in Edge,
REM no browser chrome, no way to navigate away. This replaced the Electron
REM shell entirely: Edge ships with every Windows install, so there's no app
REM to build, package, or keep updated - just this shortcut per machine.

setlocal

REM --- Point this at your real deployed CMS before using this on an actual screen ---
set PLAYER_URL=http://localhost:3000/player

set EDGE_PATH="%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist %EDGE_PATH% set EDGE_PATH="%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

start "" %EDGE_PATH% --kiosk "%PLAYER_URL%" --edge-kiosk-type=fullscreen --no-first-run --noerrdialogs --disable-session-crashed-bubble

endlocal
