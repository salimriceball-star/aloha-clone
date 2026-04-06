# BrowserOS Manual

## Fixed Paths

- AppImage: `/home/vboxuser/Downloads/BrowserOS.AppImage`
- Project root: `/home/vboxuser/web_clone`
- Profile: `/home/vboxuser/web_clone/.browseros-profile`
- Launcher script: `/home/vboxuser/web_clone/scripts/launch-browseros.sh`
- Desktop launcher: `/home/vboxuser/Desktop/BrowserOS-web_clone.desktop`
- Log: `/home/vboxuser/web_clone/logs/browseros.log`

## Launch Command

```bash
/home/vboxuser/Downloads/BrowserOS.AppImage \
  --no-sandbox \
  --user-data-dir=/home/vboxuser/web_clone/.browseros-profile \
  https://chatgpt.com/
```

## Recommended Launch

```bash
/home/vboxuser/web_clone/scripts/launch-browseros.sh
```

동작:

- 고정 프로필 디렉터리를 자동 생성한다.
- 로그 디렉터리를 자동 생성한다.
- 이미 실행 중이면 중복 실행을 막는다.
- `DISPLAY=:0.0` 기준으로 GUI 실행한다.

## Desktop Launch

바탕화면 런처:

- `/home/vboxuser/Desktop/BrowserOS-web_clone.desktop`

실행 파일:

- `/home/vboxuser/web_clone/scripts/launch-browseros.sh`

## Verification

확인 기준:

- 프로세스에 `BrowserOS.AppImage --no-sandbox --user-data-dir=/home/vboxuser/web_clone/.browseros-profile` 가 보일 것
- 로그 파일 `/home/vboxuser/web_clone/logs/browseros.log` 가 생성될 것

예시:

```bash
ps -ef | grep BrowserOS.AppImage
tail -n 50 /home/vboxuser/web_clone/logs/browseros.log
```

## Notes

- 동일 세션/동일 프로필 유지가 목표이므로 다른 프로필 경로를 섞지 않는다.
- 추후 자동화는 같은 프로필 경로를 재사용한다.
