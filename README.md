# 소방전술 작전판

소방승진시험(2026-11-07) 대비 3회독 학습 일정을 자동 계산하고, 매일 공부할 파일 범위·타이머·진행률·숫자 암기 시트를 관리하는 개인용 대시보드입니다.

- 순수 정적 사이트 (HTML/CSS/JS 단일 파일, 백엔드 없음)
- 데이터는 브라우저 `localStorage`에만 저장됩니다 (기기 간 동기화 없음 — 설정 메뉴에서 JSON 백업/복원 가능)
- 화재 613p/290파일, 구조 436p/175파일, 구급 390p/130파일, 1~3회독 + 총정리 4일 + 기출 10일 일정을 2026-09-05부터 자동 계산

## GitHub Pages로 배포하기

이미 이 폴더가 git 저장소로 초기화되어 있습니다. 본인 GitHub 계정에 새 저장소를 만든 뒤 아래 명령어로 푸시하세요.

```bash
# 1. GitHub에서 새 저장소 생성 (예: fire-tactics-tracker), 그 다음:
cd repo
git remote add origin https://github.com/<본인아이디>/<레포이름>.git
git branch -M main
git push -u origin main
```

푸시 후 GitHub 저장소 **Settings → Pages** 에서 Source를 `Deploy from a branch`, Branch를 `main` / `(root)`로 설정하면 몇 분 뒤

```
https://<본인아이디>.github.io/<레포이름>/
```

에서 바로 접속할 수 있습니다.

## 로컬에서 미리보기

인터넷 없이 그냥 `index.html` 파일을 더블클릭해서 브라우저로 열어도 100% 동일하게 동작합니다.

## 나중에 수정하고 싶을 때

`index.html` 하나뿐인 파일입니다. 필요한 부분을 고치고 다시

```bash
git add index.html
git commit -m "update"
git push
```

하면 GitHub Pages가 자동으로 갱신됩니다.
