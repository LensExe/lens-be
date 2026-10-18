# CI/CD của Lens Backend

Tài liệu này giải thích pipeline trong [ci-cd.yml](../.github/workflows/ci-cd.yml) từ đầu đến cuối: khi nào nó chạy, từng job và từng step làm gì, image Docker được build ra sao, image đó tới VPS bằng đường nào, và những việc pipeline **không** làm.

Mọi nhận định đều dẫn `file:dòng` để tự mở ra đối chiếu. Chỗ nào là hành vi của công cụ bên ngoài (GitHub Actions, Docker, Portainer) mà repo không tự chứng minh được thì ghi rõ là "theo tài liệu của công cụ".

> Repo chỉ có **một** workflow: thư mục `.github/workflows/` chỉ chứa `ci-cd.yml`.

## Mục lục

1. [Tổng quan luồng](#1-tổng-quan-luồng)
2. [Kiểm tra ở máy local trước khi tới CI](#2-kiểm-tra-ở-máy-local-trước-khi-tới-ci)
3. [Trigger: khi nào workflow chạy](#3-trigger-khi-nào-workflow-chạy)
4. [Permissions](#4-permissions)
5. [Job `quality`](#5-job-quality--validate-backend)
6. [Job `validate-images`](#6-job-validate-images--chỉ-chạy-trên-pull-request)
7. [Job `publish`](#7-job-publish--build-và-push-image-lên-ghcr)
8. [Job `deploy`](#8-job-deploy--gọi-webhook-portainer)
9. [Hai Dockerfile](#9-hai-dockerfile)
10. [`.dockerignore`](#10-dockerignore)
11. [Image tag strategy](#11-image-tag-strategy)
12. [Cache](#12-cache)
13. [Phía server: Portainer dùng image thế nào](#13-phía-server-portainer-dùng-image-thế-nào)
14. [Secret, variable và env được dùng](#14-secret-variable-và-env-được-dùng)
15. [Những gì CI KHÔNG làm](#15-những-gì-ci-không-làm)
16. [Chạy lại và debug một run fail](#16-chạy-lại-và-debug-một-run-fail)
17. [Cách thêm một step hoặc job mới](#17-cách-thêm-một-step-hoặc-job-mới)
18. [Checklist khi đổi Dockerfile](#18-checklist-khi-đổi-dockerfile)
19. [Rollback](#19-rollback)
20. [Câu hỏi thường gặp](#20-câu-hỏi-thường-gặp)
21. [Điểm cần lưu ý](#21-điểm-cần-lưu-ý)

Phụ lục:

- [A. Đọc `ci-cd.yml` từng dòng](#phụ-lục-a-đọc-ci-cdyml-từng-dòng)
- [B. Khái niệm GitHub Actions dùng trong workflow](#phụ-lục-b-khái-niệm-github-actions-dùng-trong-workflow)
- [C. Đọc hai Dockerfile từng instruction](#phụ-lục-c-đọc-hai-dockerfile-từng-instruction)
- [D. Bảng tra cứu lỗi nhanh](#phụ-lục-d-bảng-tra-cứu-lỗi-nhanh)
- [E. Glossary](#phụ-lục-e-glossary)

---

## 1. Tổng quan luồng

Workflow tên `Lens Backend CI/CD` ([ci-cd.yml:1](../.github/workflows/ci-cd.yml)) có 4 job. Job nào chạy phụ thuộc vào **sự kiện** kích hoạt:

| Job               | Tên hiển thị                         | Chạy khi                            | Phụ thuộc (`needs`) | Dòng    |
| ----------------- | ------------------------------------ | ----------------------------------- | ------------------- | ------- |
| `quality`         | Validate backend                     | Mọi sự kiện                         | —                   | 17–42   |
| `validate-images` | Validate `<service>` Docker image    | Chỉ `pull_request`                  | `quality`           | 44–73   |
| `publish`         | Publish backend and AI worker images | Mọi sự kiện **khác** `pull_request` | `quality`           | 75–138  |
| `deploy`          | Redeploy Portainer stack             | Mọi sự kiện **khác** `pull_request` | `publish`           | 140–168 |

### Luồng khi mở / cập nhật Pull Request vào `master`

```text
PR → master
  │
  ▼
quality (checkout → pnpm → node → install → typecheck → unit test)
  │  pass
  ▼
validate-images (matrix 2 job song song)
  ├─ build ./Dockerfile           → tag lens-backend:pr-validation   (KHÔNG push)
  └─ build ./Dockerfile.ai-worker → tag lens-ai-worker:pr-validation (KHÔNG push)

publish, deploy: bị skip (if: event != pull_request)
```

### Luồng khi push lên `master` (merge PR) hoặc bấm chạy tay

```text
push master / workflow_dispatch
  │
  ▼
quality
  │  pass
  ▼
publish (environment: production)
  ├─ build ./Dockerfile           → push ghcr.io/<owner>/lens-backend:{latest, sha-<sha>, <branch>}
  └─ build ./Dockerfile.ai-worker → push ghcr.io/<owner>/lens-ai-worker:{latest, sha-<sha>, <branch>}
  │
  ▼
deploy (environment: production)
  ├─ có secret PORTAINER_WEBHOOK_URL?           → curl POST → Portainer redeploy stack backend
  └─ có secret PORTAINER_AI_WORKER_WEBHOOK_URL? → curl POST → Portainer redeploy stack ai-worker
  │
  ▼
Portainer (trên VPS) pull lại image `latest` từ GHCR và tạo lại container
```

Điểm mấu chốt để nhớ:

- CI **không SSH** vào server, không chạy `docker` trên server. Nó chỉ làm 2 việc ra bên ngoài: **push image lên GHCR** và **gọi một URL webhook** của Portainer ([ci-cd.yml:152–164](../.github/workflows/ci-cd.yml)).
- Server tự đi kéo image về (pull model), CI chỉ "bấm chuông" báo có bản mới.

### Sequence diagram (push `master`)

Sơ đồ dưới vẽ đúng các bước có trong [ci-cd.yml](../.github/workflows/ci-cd.yml) và [deploy/portainer/README.md:52–54](../deploy/portainer/README.md). Phần trong khối "Portainer" là hành vi được README mô tả, workflow không quan sát được.

```mermaid
sequenceDiagram
    autonumber
    actor Dev
    participant GH as GitHub (repo LensExe/lens-be)
    participant Q as Runner: job quality
    participant P as Runner: job publish
    participant GHCR as ghcr.io
    participant D as Runner: job deploy
    participant PT as Portainer (VPS)

    Dev->>GH: merge PR / push master
    GH->>Q: khởi chạy workflow (event push)
    Q->>Q: checkout, setup pnpm 11.1.2, setup node 22
    Q->>Q: pnpm install --frozen-lockfile
    Q->>Q: pnpm typecheck
    Q->>Q: pnpm test:unit
    Q-->>GH: success
    GH->>P: chạy publish (needs: quality, environment production)
    P->>P: IMAGE_OWNER = owner viết thường
    P->>GHCR: docker login bằng GITHUB_TOKEN
    P->>P: build ./Dockerfile (cache gha scope backend)
    P->>GHCR: push lens-backend: latest, sha-<sha>, master
    P->>P: build ./Dockerfile.ai-worker (cache gha scope ai-worker)
    P->>GHCR: push lens-ai-worker: latest, sha-<sha>, master
    P-->>GH: success
    GH->>D: chạy deploy (needs: publish, environment production)
    alt có secret PORTAINER_WEBHOOK_URL
        D->>PT: POST webhook backend (curl, retry 3)
    else không có
        D->>D: echo "not configured"
    end
    alt có secret PORTAINER_AI_WORKER_WEBHOOK_URL
        D->>PT: POST webhook AI worker (curl, retry 3)
    else không có
        D->>D: echo "not configured"
    end
    rect rgba(128,128,128,0.15)
        Note over PT,GHCR: Theo README Portainer
        PT->>GH: checkout commit mới của master (compose file)
        PT->>GHCR: pull image tag latest (pull_policy always)
        PT->>PT: tạo lại container
    end
```

### Sequence diagram (Pull Request)

```mermaid
sequenceDiagram
    autonumber
    actor Dev
    participant GH as GitHub
    participant Q as Runner: job quality
    participant V1 as Runner: validate lens-backend
    participant V2 as Runner: validate lens-ai-worker
    participant C as GitHub Actions cache

    Dev->>GH: mở / cập nhật PR vào master
    GH->>Q: chạy quality
    Q-->>GH: success
    par matrix
        GH->>V1: build ./Dockerfile (push: false)
        V1->>C: đọc/ghi cache scope lens-backend
    and
        GH->>V2: build ./Dockerfile.ai-worker (push: false)
        V2->>C: đọc/ghi cache scope lens-ai-worker
    end
    Note over GH: publish và deploy bị skip
```

---

## 2. Kiểm tra ở máy local trước khi tới CI

Trước khi code lên GitHub, repo đã cài sẵn vài lớp kiểm tra chạy trên máy dev bằng Husky. Chúng **không** phải là CI, nhưng nên hiểu để biết lớp nào bắt lỗi gì.

### 2.1 Husky được cài thế nào

- Script `"prepare": "husky"` ([package.json:32](../package.json)). `prepare` là lifecycle script mà pnpm/npm tự chạy sau `pnpm install`, nên ai clone repo rồi `pnpm install` là hook được kích hoạt.
- Thư mục `.husky/_` chứa phần ruột do Husky sinh ra; các hook do repo viết nằm ở `.husky/pre-commit`, `.husky/commit-msg`, `.husky/post-merge`.

### 2.2 `pre-commit`

[.husky/pre-commit](../.husky/pre-commit):

```sh
# node scripts/secrets-auto.mjs pre-commit
# node scripts/secrets-guard.mjs
npx lint-staged
```

- Dòng 1–2 đang **bị comment**, tức là `secrets-auto` và `secrets-guard` hiện **không chạy**.
- Dòng 3 chạy `lint-staged`, cấu hình ở [.lintstagedrc.json](../.lintstagedrc.json):

  | Pattern file           | Lệnh chạy trên file đã `git add`                         | Dòng |
  | ---------------------- | -------------------------------------------------------- | ---- |
  | `*.{ts,js}`            | `prettier --write`, rồi `eslint --fix --no-warn-ignored` | 2    |
  | `*.{json,yaml,yml,md}` | `prettier --write`                                       | 3    |

  `lint-staged` chỉ đụng vào **file đang staged**, không phải toàn repo. Prettier dùng [.prettierrc](../.prettierrc) (`singleQuote: true`, `trailingComma: "all"`).

### 2.3 `commit-msg`

[.husky/commit-msg:1](../.husky/commit-msg) chạy `npx --no -- commitlint --edit "$1"`. Luật ở [.commitlintrc.json](../.commitlintrc.json): kế thừa `@commitlint/config-conventional` (dòng 2) và nới `header-max-length` lên 150 ký tự (dòng 4). Commit message sai dạng `type(scope): msg` sẽ bị chặn ngay tại máy.

### 2.4 `post-merge`

[.husky/post-merge:1](../.husky/post-merge) chỉ có một dòng **đã comment** (`secrets-auto.mjs post-merge`), nên hiện không làm gì.

### 2.5 So sánh lớp local và lớp CI

| Kiểm tra                   | Local (Husky)        | CI (`quality`)                                         |
| -------------------------- | -------------------- | ------------------------------------------------------ |
| Prettier                   | Có, trên file staged | **Không**                                              |
| ESLint                     | Có, trên file staged | **Không**                                              |
| Commit message             | Có (commitlint)      | **Không**                                              |
| Typecheck (`tsc --noEmit`) | **Không**            | Có ([ci-cd.yml:38–39](../.github/workflows/ci-cd.yml)) |
| Unit test                  | **Không**            | Có ([ci-cd.yml:41–42](../.github/workflows/ci-cd.yml)) |
| Build Docker image         | **Không**            | Có (PR: chỉ build; master: build + push)               |

Hệ quả: hook local có thể bị bỏ qua bằng `git commit --no-verify`, và CI cũng không chạy lại ESLint/Prettier. Xem [mục 21](#21-điểm-cần-lưu-ý).

---

## 3. Trigger: khi nào workflow chạy

```yaml
on:
  pull_request:
    branches:
      - master
  push:
    branches:
      - master
  workflow_dispatch:
```

([ci-cd.yml:3–10](../.github/workflows/ci-cd.yml))

| Sự kiện                   | Ý nghĩa                                                                                                              | `github.event_name` |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `pull_request` → `master` | PR có **base** là `master` được mở, push thêm commit, hoặc reopen (các activity type mặc định theo tài liệu GitHub). | `pull_request`      |
| `push` → `master`         | Có commit mới trên `master` (thường là khi merge PR).                                                                | `push`              |
| `workflow_dispatch`       | Bấm nút **Run workflow** trên tab Actions. Lúc bấm, GitHub cho chọn branch để chạy.                                  | `workflow_dispatch` |

Những thứ workflow **không** khai báo:

- **Không có `paths` / `paths-ignore`**: sửa một file `.md` trong `docs/` rồi push `master` cũng chạy đủ 4 job, kể cả build, push image và redeploy.
- **Không có `concurrency`**: hai lần push liên tiếp sinh ra hai run chạy song song, không run nào bị hủy. Xem [mục 21](#21-điểm-cần-lưu-ý).
- **Không có `schedule`** (cron) và không có trigger theo tag (`push: tags`).

### Điều kiện ở cấp job

Ba job sau dùng `if:` dựa vào `github.event_name`:

- `validate-images`: `if: ${{ github.event_name == 'pull_request' }}` ([ci-cd.yml:46](../.github/workflows/ci-cd.yml)).
- `publish`: `if: ${{ github.event_name != 'pull_request' }}` ([ci-cd.yml:77](../.github/workflows/ci-cd.yml)).
- `deploy`: `if: ${{ github.event_name != 'pull_request' }}` ([ci-cd.yml:142](../.github/workflows/ci-cd.yml)).

Lưu ý chữ `!=`: điều kiện của `publish`/`deploy` là "không phải PR", nên nó đúng cho **cả** `push` lẫn `workflow_dispatch`. Workflow không kiểm branch ở đây.

---

## 4. Permissions

```yaml
permissions:
  contents: read
  packages: write
```

([ci-cd.yml:12–14](../.github/workflows/ci-cd.yml))

Khối này đặt ở **cấp workflow**, nên áp cho mọi job. Nó quyết định quyền của token tự động `GITHUB_TOKEN` mà GitHub cấp cho mỗi run:

- `contents: read`: đủ để `actions/checkout` đọc code.
- `packages: write`: cho phép push image lên GitHub Container Registry (GHCR). Job `publish` dùng chính `GITHUB_TOKEN` để login GHCR ([ci-cd.yml:96](../.github/workflows/ci-cd.yml)).
- Mọi quyền không liệt kê thì bị đặt thành `none` (theo tài liệu GitHub: khi khai báo `permissions`, các scope không nêu sẽ không có quyền).

Job `quality` và `validate-images` cũng nhận `packages: write` dù không cần. Xem [mục 21](#21-điểm-cần-lưu-ý).

---

## 5. Job `quality` — Validate backend

([ci-cd.yml:17–42](../.github/workflows/ci-cd.yml))

Đây là "cổng" đầu tiên. `validate-images` và `publish` đều `needs: quality` ([ci-cd.yml:47](../.github/workflows/ci-cd.yml), [ci-cd.yml:78](../.github/workflows/ci-cd.yml)), nên `quality` fail thì không có image nào được build.

- `runs-on: ubuntu-latest` ([dòng 19](../.github/workflows/ci-cd.yml)): chạy trên runner Linux do GitHub host. Mỗi job được một máy ảo mới tinh, không chia sẻ file với job khác.

### Step 1 — Checkout

```yaml
- name: Checkout
  uses: actions/checkout@v4
```

([dòng 21–22](../.github/workflows/ci-cd.yml)) Clone code của commit đang chạy vào runner. Với `pull_request`, theo tài liệu GitHub, commit được checkout là merge commit giả lập (PR merge vào `master`), không phải đầu nhánh PR. Nghĩa là CI kiểm "code sau khi merge" chứ không chỉ "code trên nhánh".

### Step 2 — Setup pnpm

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 11.1.2
```

([dòng 24–27](../.github/workflows/ci-cd.yml)) Cài đúng pnpm `11.1.2`. Phiên bản này được ghim bằng tay: [package.json](../package.json) **không có** trường `packageManager`, nên action không tự suy ra được. Step này phải đứng **trước** `setup-node`, vì step sau dùng `cache: pnpm` cần lệnh `pnpm` có sẵn để tìm thư mục store.

### Step 3 — Setup Node.js

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm
```

([dòng 29–33](../.github/workflows/ci-cd.yml))

- `node-version: 22`: khớp với base image `node:22-bookworm-slim` trong cả hai Dockerfile ([Dockerfile:3](../Dockerfile), [Dockerfile:30](../Dockerfile)).
- `cache: pnpm`: theo tài liệu `setup-node`, nó cache **pnpm store** (kho package đã tải) với key tính từ hash của `pnpm-lock.yaml`. Lockfile không đổi thì lần sau `pnpm install` lấy từ cache, không tải lại từ registry. Đây là cache của job `quality`, khác hoàn toàn với cache Docker layer ở [mục 12](#12-cache).

### Step 4 — Install dependencies

```yaml
run: pnpm install --frozen-lockfile
```

([dòng 35–36](../.github/workflows/ci-cd.yml)) `--frozen-lockfile` nghĩa là: nếu `package.json` và `pnpm-lock.yaml` lệch nhau thì **fail** thay vì tự sửa lockfile. Đây là lỗi hay gặp khi ai đó sửa `package.json` mà quên commit lockfile.

Chú ý: `pnpm install` cũng chạy script `prepare` → `husky` ([package.json:32](../package.json)). Trên CI việc này vô hại.

Package nào được phép chạy build script khi install được khai báo trong [pnpm-workspace.yaml:1–5](../pnpm-workspace.yaml) (`allowBuilds`).

### Step 5 — Typecheck

```yaml
run: pnpm typecheck
```

([dòng 38–39](../.github/workflows/ci-cd.yml)) → `tsc --noEmit` ([package.json:59](../package.json)).

- Dùng [tsconfig.json](../tsconfig.json) ở gốc repo. File này **không có** `include`/`exclude`, nên theo luật mặc định của TypeScript nó kiểm mọi file `.ts` trong repo (trừ `node_modules` và `outDir`), tức là gồm cả `apps/*`, `src/` và `test/`.
- `--noEmit`: chỉ kiểm kiểu, không sinh file JS.
- Luật kiểu đáng nhớ: `strictNullChecks: true` nhưng `noImplicitAny: false` ([tsconfig.json:19](../tsconfig.json), [tsconfig.json:21](../tsconfig.json)).

Typecheck **không** thay cho `nest build`. Build thật chỉ xảy ra bên trong Docker (xem [mục 9](#9-hai-dockerfile)).

### Step 6 — Unit tests

```yaml
run: pnpm test:unit
```

([dòng 41–42](../.github/workflows/ci-cd.yml)) → `node -r ts-node/register -r tsconfig-paths/register --test test/*.test.ts` ([package.json:56](../package.json)).

- Dùng test runner có sẵn của Node (`node --test`), không phải Jest.
- `-r ts-node/register`: cho Node chạy thẳng file `.ts`.
- `-r tsconfig-paths/register`: để import alias `@modules/*`, `@shared/*`, `@features/*` ([tsconfig.json:24–28](../tsconfig.json)) chạy được lúc runtime.
- Glob `test/*.test.ts` **chỉ** bắt file đuôi `.test.ts`. Vì vậy `test/openapi.contract.ts` và `test/lens.integration.ts` **không chạy** trên CI. Các file như `domain-boundaries.test.ts`, `kong-config.contract.test.ts` thì có chạy vì đuôi `.test.ts`.
- `pnpm test` ([package.json:27](../package.json)) và `pnpm test:unit` có câu lệnh y hệt nhau.
- Các script Jest (`test:watch`, `test:cov`, `test:e2e`, [package.json:28–31](../package.json)) không được CI gọi.

---

## 6. Job `validate-images` — chỉ chạy trên Pull Request

([ci-cd.yml:44–73](../.github/workflows/ci-cd.yml))

Mục đích: chứng minh cả hai Dockerfile **build được** trước khi merge, nhưng **không** đẩy image đi đâu.

### Matrix

```yaml
strategy:
  matrix:
    include:
      - service: lens-backend
        dockerfile: ./Dockerfile
        tag: lens-backend:pr-validation
      - service: lens-ai-worker
        dockerfile: ./Dockerfile.ai-worker
        tag: lens-ai-worker:pr-validation
```

([dòng 49–57](../.github/workflows/ci-cd.yml)) `matrix.include` sinh ra **2 job con chạy song song**, mỗi job nhận bộ biến `service`, `dockerfile`, `tag` riêng. Tên job hiển thị là `Validate ${{ matrix.service }} Docker image` ([dòng 45](../.github/workflows/ci-cd.yml)), nên trên giao diện bạn thấy 2 dòng: "Validate lens-backend Docker image" và "Validate lens-ai-worker Docker image".

Mặc định của matrix (theo tài liệu GitHub) là `fail-fast: true`: một job con fail thì job con còn lại bị hủy.

### Step 1 — Checkout

([dòng 59–60](../.github/workflows/ci-cd.yml)) Như ở `quality`. Job này chạy trên máy mới, nên phải checkout lại.

### Step 2 — Setup Docker Buildx

```yaml
uses: docker/setup-buildx-action@v3
```

([dòng 62–63](../.github/workflows/ci-cd.yml)) Tạo một builder BuildKit. Cần builder này thì mới dùng được cache kiểu `type=gha` ở step sau (driver `docker` mặc định không hỗ trợ cache export này, theo tài liệu Docker).

### Step 3 — Build image without publishing

```yaml
uses: docker/build-push-action@v6
with:
  context: .
  file: ${{ matrix.dockerfile }}
  push: false
  tags: ${{ matrix.tag }}
  cache-from: type=gha,scope=${{ matrix.service }}
  cache-to: type=gha,mode=max,scope=${{ matrix.service }}
```

([dòng 65–73](../.github/workflows/ci-cd.yml))

| Tham số       | Ý nghĩa                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `context: .`  | Gửi toàn bộ thư mục repo (đã lọc qua [.dockerignore](../.dockerignore)) làm build context.                 |
| `file`        | Dockerfile lấy từ matrix.                                                                                  |
| `push: false` | Build xong thì thôi, không push. Image nằm trong cache của builder rồi biến mất khi runner tắt.            |
| `tags`        | `lens-backend:pr-validation` / `lens-ai-worker:pr-validation`. Chỉ là tên local, không có registry prefix. |
| `cache-from`  | Đọc layer cache từ GitHub Actions cache, scope `lens-backend` hoặc `lens-ai-worker`.                       |
| `cache-to`    | Ghi cache lại. `mode=max` = lưu cả layer của stage trung gian (`build`), không chỉ stage cuối.             |

Job này **không cần secret nào**, nên PR từ fork vẫn chạy được (theo tài liệu GitHub, PR từ fork không nhận secret của repo).

Cache scope ở đây (`lens-backend`, `lens-ai-worker`) **khác** với scope ở job `publish` (`backend`, `ai-worker`). Xem [mục 12](#12-cache).

---

## 7. Job `publish` — build và push image lên GHCR

([ci-cd.yml:75–138](../.github/workflows/ci-cd.yml))

```yaml
publish:
  if: ${{ github.event_name != 'pull_request' }}
  needs: quality
  runs-on: ubuntu-latest
  environment: production
```

- `environment: production` ([dòng 80](../.github/workflows/ci-cd.yml)): gắn job vào GitHub Environment tên `production`. Theo tài liệu GitHub, điều này cho phép (a) đọc secret khai báo riêng ở environment đó, và (b) áp các protection rule của environment (người duyệt, giới hạn branch được deploy, wait timer). Repo **không** chứa cấu hình của environment; các rule này nằm trong **Settings → Environments** trên GitHub, nên tài liệu này không xác minh được environment `production` hiện có rule gì.

Job này build **tuần tự** hai image trong cùng một job (backend trước, AI worker sau), không dùng matrix.

### Step 1 — Checkout

([dòng 82–83](../.github/workflows/ci-cd.yml))

### Step 2 — Normalize image owner

```yaml
run: echo "IMAGE_OWNER=${GITHUB_REPOSITORY_OWNER,,}" >> "$GITHUB_ENV"
```

([dòng 85–86](../.github/workflows/ci-cd.yml))

- `GITHUB_REPOSITORY_OWNER` là biến môi trường có sẵn: tên owner của repo. Remote của repo là `LensExe/lens-be`, nên owner là `LensExe`.
- `${VAR,,}` là cú pháp **bash** để đổi chuỗi thành chữ thường → `lensexe`. Lý do: tên image trên registry phải viết thường, `ghcr.io/LensExe/...` sẽ bị từ chối.
- Ghi `KEY=VALUE` vào file `$GITHUB_ENV` là cách GitHub Actions truyền biến môi trường cho **các step sau trong cùng job**. Từ đây, `env.IMAGE_OWNER` dùng được ở dòng 102 và 123.
- Giá trị `lensexe` khớp với mặc định `IMAGE_OWNER:-lensexe` trong stack Portainer ([backend-stack.yml:7](../deploy/portainer/backend/backend-stack.yml)) và với hướng dẫn ở [deploy/portainer/README.md:22](../deploy/portainer/README.md).

### Step 3 — Setup Docker Buildx

([dòng 88–89](../.github/workflows/ci-cd.yml)) Giống `validate-images`.

### Step 4 — Login to GitHub Container Registry

```yaml
uses: docker/login-action@v3
with:
  registry: ghcr.io
  username: ${{ github.actor }}
  password: ${{ secrets.GITHUB_TOKEN }}
```

([dòng 91–96](../.github/workflows/ci-cd.yml))

- `github.actor`: user đã kích hoạt run (người push hoặc người bấm Run workflow).
- `secrets.GITHUB_TOKEN`: token tự động, **không** phải secret bạn tự tạo. Nó có quyền `packages: write` nhờ khối permissions ở [mục 4](#4-permissions).
- Không cần Personal Access Token nào cho bước push.

### Step 5 — Docker metadata (backend)

```yaml
id: meta
uses: docker/metadata-action@v5
with:
  images: ghcr.io/${{ env.IMAGE_OWNER }}/lens-backend
  tags: |
    type=raw,value=latest
    type=raw,value=sha-${{ github.sha }}
    type=ref,event=branch
```

([dòng 98–106](../.github/workflows/ci-cd.yml))

Action này không build gì. Nó chỉ **tính ra danh sách tag và label** rồi đưa vào output `steps.meta.outputs.tags` / `steps.meta.outputs.labels`. `id: meta` là tên để step sau tham chiếu. Chi tiết từng tag ở [mục 11](#11-image-tag-strategy).

### Step 6 — Build and push image (backend)

```yaml
uses: docker/build-push-action@v6
with:
  context: .
  file: ./Dockerfile
  push: true
  tags: ${{ steps.meta.outputs.tags }}
  labels: ${{ steps.meta.outputs.labels }}
  cache-from: type=gha,scope=backend
  cache-to: type=gha,mode=max,scope=backend
```

([dòng 108–117](../.github/workflows/ci-cd.yml))

- `push: true`: build xong đẩy lên `ghcr.io/lensexe/lens-backend` với mọi tag từ step trước.
- `labels`: gắn label OCI do metadata-action sinh (theo tài liệu action: nguồn repo, revision, thời điểm tạo...). Label giúp GHCR liên kết package với repo.
- Cache scope `backend`.

### Step 7, 8 — Metadata và build/push AI worker

([dòng 119–138](../.github/workflows/ci-cd.yml)) Lặp lại y hệt hai step trên, khác ở:

| Khác biệt   | Backend            | AI worker                |
| ----------- | ------------------ | ------------------------ |
| `id`        | `meta`             | `ai_worker_meta`         |
| Image       | `.../lens-backend` | `.../lens-ai-worker`     |
| Dockerfile  | `./Dockerfile`     | `./Dockerfile.ai-worker` |
| Cache scope | `backend`          | `ai-worker`              |

Vì hai image build tuần tự trong một job: nếu image backend build fail, step AI worker **không chạy** (mặc định step fail thì các step sau bị skip). Ngược lại, nếu backend đã push xong mà AI worker fail, thì trên GHCR `lens-backend:latest` **đã là bản mới** còn `lens-ai-worker:latest` vẫn là bản cũ, và job `deploy` sẽ không chạy vì `publish` fail.

---

## 8. Job `deploy` — gọi webhook Portainer

([ci-cd.yml:140–168](../.github/workflows/ci-cd.yml))

```yaml
deploy:
  if: ${{ github.event_name != 'pull_request' }}
  needs: publish
  runs-on: ubuntu-latest
  environment: production
  env:
    PORTAINER_WEBHOOK_URL: ${{ secrets.PORTAINER_WEBHOOK_URL }}
    PORTAINER_AI_WORKER_WEBHOOK_URL: ${{ secrets.PORTAINER_AI_WORKER_WEBHOOK_URL }}
```

- `needs: publish`: chỉ chạy khi cả hai image đã push thành công.
- Khối `env` ở cấp job ([dòng 146–148](../.github/workflows/ci-cd.yml)) copy hai secret thành biến môi trường. Lý do làm vậy: trong `if:` của **step**, GitHub không cho đọc trực tiếp `secrets.*`, nhưng đọc được `env.*`. Nhờ thế, step có thể kiểm "secret có được cấu hình không".
- Secret chưa được tạo thì biểu thức `secrets.X` trả chuỗi rỗng, nên `env.X == ''`.
- GitHub tự che (mask) giá trị secret trong log, kể cả khi nó đi qua biến môi trường.

Job **không** checkout code: nó không cần file nào, chỉ cần `curl`.

### 4 step, đi thành 2 cặp

| Step                                                   | Điều kiện                                   | Làm gì                                             | Dòng    |
| ------------------------------------------------------ | ------------------------------------------- | -------------------------------------------------- | ------- |
| Trigger Portainer webhook                              | `env.PORTAINER_WEBHOOK_URL != ''`           | `curl ... --request POST "$PORTAINER_WEBHOOK_URL"` | 150–154 |
| Skip Portainer redeploy when webhook is not configured | `env.PORTAINER_WEBHOOK_URL == ''`           | In dòng thông báo, không fail                      | 156–158 |
| Trigger AI worker Portainer webhook                    | `env.PORTAINER_AI_WORKER_WEBHOOK_URL != ''` | `curl ... POST "$PORTAINER_AI_WORKER_WEBHOOK_URL"` | 160–164 |
| Skip AI worker redeploy when webhook is not configured | `env.PORTAINER_AI_WORKER_WEBHOOK_URL == ''` | In dòng thông báo, không fail                      | 166–168 |

Mỗi cặp có điều kiện ngược nhau, nên trong mỗi cặp luôn có đúng một step chạy. Thiếu secret thì job **vẫn xanh**: image đã lên GHCR nhưng server không được báo.

### Giải nghĩa lệnh `curl`

```sh
curl --fail-with-body --silent --show-error --retry 3 \
  --retry-all-errors --request POST "$PORTAINER_WEBHOOK_URL"
```

`run: >-` trong YAML ([dòng 152](../.github/workflows/ci-cd.yml)) là folded block: các dòng được nối lại bằng dấu cách thành một lệnh, `-` bỏ ký tự xuống dòng cuối.

| Cờ                   | Ý nghĩa                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `--fail-with-body`   | HTTP status ≥ 400 thì curl trả exit code khác 0 (step fail), nhưng vẫn in body lỗi ra log. |
| `--silent`           | Tắt thanh tiến trình.                                                                      |
| `--show-error`       | Dù `--silent`, vẫn in thông báo lỗi.                                                       |
| `--retry 3`          | Thử lại tối đa 3 lần.                                                                      |
| `--retry-all-errors` | Thử lại với **mọi** lỗi (mặc định curl chỉ retry vài loại lỗi tạm thời).                   |
| `--request POST`     | Gửi POST. Webhook Portainer nhận POST, không có body.                                      |

URL được đặt trong `"..."` và đọc từ biến môi trường, nên giá trị secret không bị nhúng vào nội dung lệnh trong file YAML.

Hai webhook gọi **tuần tự**: backend trước, AI worker sau. Nếu webhook backend fail sau 3 lần retry, step AI worker bị skip.

### Workflow không kiểm tra sau deploy

Sau `curl` không có step nào chờ container healthy hay gọi thử API. Job xanh chỉ có nghĩa là "Portainer đã nhận request", không có nghĩa là "bản mới đang chạy ổn".

---

## 9. Hai Dockerfile

Cả hai đều là **multi-stage build**: stage `build` có đủ devDependencies để compile TypeScript, stage `runtime` chỉ chứa production dependencies và code đã build. Image cuối nhỏ hơn và không chứa source `.ts`.

### 9.1 [Dockerfile](../Dockerfile) (lens-backend, app `core`)

**Stage `build`** (dòng 3–28):

| Dòng  | Lệnh                                                                              | Vì sao                                                                                                                                                  |
| ----- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `# syntax=docker/dockerfile:1.7`                                                  | Chọn phiên bản cú pháp Dockerfile cho BuildKit.                                                                                                         |
| 3     | `FROM node:22-bookworm-slim AS build`                                             | Node 22 trên Debian Bookworm bản slim.                                                                                                                  |
| 6–7   | `ENV PNPM_HOME`, `ENV PATH`                                                       | Đưa thư mục pnpm vào PATH.                                                                                                                              |
| 13    | `corepack enable && corepack prepare pnpm@11.1.2 --activate`                      | Cài pnpm qua corepack, **cùng** phiên bản với CI ([ci-cd.yml:27](../.github/workflows/ci-cd.yml)).                                                      |
| 16–18 | `COPY package.json pnpm-lock.yaml ... tsconfig*.json`, `apps/*/tsconfig.app.json` | Chỉ copy file khai báo dependency trước. Comment ở dòng 15 nói rõ mục đích: giữ layer install cache được.                                               |
| 21    | `pnpm install --frozen-lockfile`                                                  | Cài đủ dependencies (kể cả dev).                                                                                                                        |
| 24–25 | `COPY apps/core apps/core`, `COPY src src`                                        | Giờ mới copy source. Sửa code mà không đổi lockfile → layer dòng 21 vẫn dùng cache.                                                                     |
| 28    | `pnpm build`                                                                      | → `nest build core` ([package.json:9](../package.json)), output vào `dist/apps/core` ([apps/core/tsconfig.app.json:5](../apps/core/tsconfig.app.json)). |

Vì sao tách COPY làm 2 lần (dòng 16–18 rồi 24–25)? Docker cache từng layer theo nội dung input. Nếu copy hết source trước rồi mới `pnpm install`, thì mỗi lần sửa một file `.ts` sẽ làm mất cache của bước install (bước chậm nhất). Tách ra thì chỉ khi `package.json`/lockfile đổi mới phải install lại.

**Stage `runtime`** (dòng 30–68):

| Dòng  | Lệnh                                                                   | Vì sao                                                                                                                                                                                          |
| ----- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30    | `FROM node:22-bookworm-slim AS runtime`                                | Bắt đầu lại từ image sạch. Không mang theo gì từ stage `build` trừ khi `COPY --from=build`.                                                                                                     |
| 33–34 | `ENV NODE_ENV=production`, `ENV PORT=3000`                             | Giá trị mặc định, stack Portainer có thể ghi đè ([backend-stack.yml:62](../deploy/portainer/backend/backend-stack.yml), [backend-stack.yml:71](../deploy/portainer/backend/backend-stack.yml)). |
| 40–41 | `groupadd`/`useradd` uid/gid 1001 tên `lens`                           | Tạo user không phải root.                                                                                                                                                                       |
| 44    | `COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./`              | Chỉ cần file khai báo để cài production deps.                                                                                                                                                   |
| 47–50 | `pnpm install --prod --frozen-lockfile --ignore-scripts` rồi xóa cache | Chỉ cài `dependencies`, bỏ `devDependencies`. `--ignore-scripts` để không chạy lifecycle script (vd `prepare: husky`, mà husky là devDependency nên không có). Xóa cache cho image nhỏ.         |
| 53    | `COPY --from=build --chown=lens:lens /app/dist ./dist`                 | Lấy code đã build từ stage trước, đổi owner thành `lens`.                                                                                                                                       |
| 56    | `chown -R lens:lens /app/node_modules`                                 | Cho user `lens` sở hữu `node_modules`.                                                                                                                                                          |
| 59    | `USER lens`                                                            | Từ đây process chạy bằng user `lens`, không phải root.                                                                                                                                          |
| 61    | `EXPOSE 3000`                                                          | Chỉ là metadata, không mở port ra host. Stack backend cũng không publish port (README dòng 41).                                                                                                 |
| 64–65 | `HEALTHCHECK ... fetch('http://127.0.0.1:' + PORT + '/docs')`          | Docker gọi `/docs` mỗi 30s; fail 3 lần liên tiếp thì container bị đánh dấu `unhealthy`. Dùng `fetch` có sẵn của Node 22 nên không cần cài `curl`.                                               |
| 68    | `CMD ["node", "dist/apps/core/apps/core/src/main.js"]`                 | Lệnh chạy app. Đường dẫn lặp `apps/core` hai lần vì `outDir` là `dist/apps/core` và cấu trúc thư mục nguồn được giữ nguyên bên dưới.                                                            |

Về healthcheck `/docs`: Swagger được mount bằng `SwaggerModule.setup('docs', ...)` ([src/features/api/setup.ts:58](../src/features/api/setup.ts)). App có global prefix `api/v1` ([setup.ts:13](../src/features/api/setup.ts)), nhưng theo tài liệu `@nestjs/swagger`, `setup()` mặc định **không** áp global prefix, nên đường dẫn vẫn là `/docs`. Comment ở [Dockerfile:63](../Dockerfile) và [deploy/portainer/README.md:213–215](../deploy/portainer/README.md) cũng nói `/docs` không cần auth.

### 9.2 [Dockerfile.ai-worker](../Dockerfile.ai-worker) (lens-ai-worker)

Cấu trúc giống hệt, khác ở:

| Điểm khác                 | Dockerfile (core)                      | Dockerfile.ai-worker                                                                                                                                                  |
| ------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tsconfig app được copy    | `apps/core`, `apps/cli` (dòng 17–18)   | `apps/ai-worker` (dòng 17)                                                                                                                                            |
| Source được copy          | `apps/core`, `src` (dòng 24–25)        | `apps/ai-worker`, `src` (dòng 23, 25)                                                                                                                                 |
| Lệnh build                | `pnpm build` (dòng 28)                 | `pnpm build:ai-worker` → `nest build ai-worker` (dòng 28, [package.json:11](../package.json))                                                                         |
| Copy sang runtime         | cả `/app/dist` (dòng 53)               | chỉ `/app/dist/apps/ai-worker` (dòng 49)                                                                                                                              |
| `ENV PORT`                | `3000` (dòng 34)                       | không đặt                                                                                                                                                             |
| `EXPOSE`                  | `3000` (dòng 61)                       | `3001` (dòng 57)                                                                                                                                                      |
| `HEALTHCHECK` trong image | Có, `/docs` (dòng 64–65)               | **Không**. Healthcheck nằm trong stack Portainer, gọi `http://127.0.0.1:3001/health` ([ai-worker-stack.yml:48–57](../deploy/portainer/ai-worker/ai-worker-stack.yml)) |
| `CMD`                     | `dist/apps/core/apps/core/src/main.js` | `dist/apps/ai-worker/apps/ai-worker/src/main.js` (dòng 60)                                                                                                            |

App `ai-worker` compile cả `src/modules/ai-assistant/**` ngoài `apps/ai-worker/src` ([apps/ai-worker/tsconfig.app.json:7](../apps/ai-worker/tsconfig.app.json)).

### 9.3 Những gì **không** có trong image

Dựa trên các lệnh `COPY` ở trên, image chỉ chứa `package.json`, lockfile, `pnpm-workspace.yaml`, `node_modules` (prod) và `dist/`. Tức là image **không có**:

- `migrations/` (SQL migration),
- `scripts/` (gồm `migrate-lens.cjs`, `migrate-ai.cjs`, `seed.mjs`),
- `test/`, `docs/`, `deploy/`.

Hệ quả: không thể vào container rồi chạy `pnpm db:migrate`. Xem [mục 15](#15-những-gì-ci-không-làm).

---

## 10. `.dockerignore`

[.dockerignore](../.dockerignore) quyết định file nào **không** được gửi vào build context (`context: .`):

| Dòng | Pattern                           | Ý nghĩa                                            |
| ---- | --------------------------------- | -------------------------------------------------- |
| 1    | `node_modules`                    | Không gửi `node_modules` của runner; image tự cài. |
| 2    | `dist`                            | Không gửi build cũ.                                |
| 3    | `.git`                            | Không gửi lịch sử git.                             |
| 4    | `.turbo`                          | Cache Turbo.                                       |
| 5    | `coverage`                        | Báo cáo coverage.                                  |
| 6    | `*.log`                           | File log.                                          |
| 7–9  | `.env`, `.env.*`, `!.env.example` | Chặn mọi file env (secret), trừ `.env.example`.    |
| 10   | `bruno`                           | Collection API client.                             |
| 11   | `ngrok`                           |                                                    |
| 12   | `scripts/assets`                  |                                                    |
| 13   | `test`                            | Thư mục test.                                      |

Hai lớp bảo vệ chồng nhau: Dockerfile chỉ `COPY` đúng vài thư mục, và `.dockerignore` chặn thêm file nhạy cảm. Ngay cả khi ai đó lỡ viết `COPY . .`, file `.env` vẫn không lọt vào image.

---

## 11. Image tag strategy

Mỗi lần `publish` chạy, **mỗi** image nhận 3 tag ([ci-cd.yml:103–106](../.github/workflows/ci-cd.yml), [ci-cd.yml:124–127](../.github/workflows/ci-cd.yml)):

| Rule                                   | Tag sinh ra (vd push `master`) | Có thay đổi theo thời gian?                  |
| -------------------------------------- | ------------------------------ | -------------------------------------------- |
| `type=raw,value=latest`                | `latest`                       | Có. Luôn trỏ tới bản push gần nhất.          |
| `type=raw,value=sha-${{ github.sha }}` | `sha-<40 ký tự SHA đầy đủ>`    | Không. Mỗi commit một tag, dùng để rollback. |
| `type=ref,event=branch`                | `master` (tên branch)          | Có. Trỏ tới bản mới nhất của branch đó.      |

Ghi chú:

- `github.sha` là SHA **đầy đủ** 40 ký tự, nên tag là `sha-` + 40 ký tự, không phải SHA rút gọn 7 ký tự. (Nếu dùng `type=sha` có sẵn của metadata-action thì mặc định sẽ là SHA rút gọn, theo tài liệu action. Workflow này không dùng cách đó.)
- `type=ref,event=branch` chỉ sinh tag khi ref là một branch. Với `workflow_dispatch` chạy trên branch `feature-x`, tag sẽ là `feature-x` (theo tài liệu metadata-action, rule này áp dụng khi `GITHUB_REF` là `refs/heads/*`).
- Tên đầy đủ sau khi push: `ghcr.io/lensexe/lens-backend:<tag>` và `ghcr.io/lensexe/lens-ai-worker:<tag>`.

Server dùng tag nào? Stack Portainer đọc `IMAGE_TAG`, mặc định `latest` ([backend-stack.yml:7](../deploy/portainer/backend/backend-stack.yml), [ai-worker-stack.yml:3](../deploy/portainer/ai-worker/ai-worker-stack.yml)). README khuyến nghị `IMAGE_TAG=latest` ([deploy/portainer/README.md:23](../deploy/portainer/README.md)) và giữ tag `sha-<commit>` để rollback ([README.md:52–56](../deploy/portainer/README.md)).

---

## 12. Cache

Pipeline có **hai loại cache** khác nhau hoàn toàn:

### 12.1 Cache pnpm store (job `quality`)

- Bật bằng `cache: pnpm` ([ci-cd.yml:33](../.github/workflows/ci-cd.yml)).
- Lưu package đã tải để `pnpm install` trên runner nhanh hơn.
- Key dựa trên `pnpm-lock.yaml` (theo tài liệu `setup-node`).

### 12.2 Cache Docker layer (`type=gha`)

- Bật bằng `cache-from` / `cache-to` trong `build-push-action`.
- Lưu **layer** của Docker build vào GitHub Actions cache. Lần sau build, layer nào input không đổi (vd layer `pnpm install` khi lockfile không đổi) được lấy lại thay vì chạy lại.
- `mode=max`: lưu cả layer của stage `build`. Đây là chỗ đáng cache nhất, vì `pnpm install` đầy đủ và `nest build` nằm ở stage này. Với `mode=min` (mặc định), chỉ layer của image cuối được lưu.
- `scope=...`: tách cache theo tên, để cache backend và AI worker không ghi đè nhau.

Bảng scope hiện tại:

| Job               | Backend scope  | AI worker scope  | Dòng             |
| ----------------- | -------------- | ---------------- | ---------------- |
| `validate-images` | `lens-backend` | `lens-ai-worker` | 72–73            |
| `publish`         | `backend`      | `ai-worker`      | 116–117, 137–138 |

Vì tên scope khác nhau, cache do PR tạo ra **không** được job `publish` dùng lại và ngược lại. Xem [mục 21](#21-điểm-cần-lưu-ý).

Một quy tắc của GitHub Actions cache (theo tài liệu GitHub): run trên nhánh PR đọc được cache của base branch (`master`), nhưng cache do PR ghi ra chỉ dùng được trong phạm vi PR đó. Dung lượng cache có giới hạn mỗi repo; cache cũ bị xóa dần khi vượt hạn mức.

---

## 13. Phía server: Portainer dùng image thế nào

CI kết thúc ở bước gọi webhook. Phần còn lại diễn ra trên VPS, do Portainer điều khiển, theo [deploy/portainer/README.md](../deploy/portainer/README.md).

### 13.1 Stack backend

- Portainer tạo stack từ **Git repository** `LensExe/lens-be`, branch `master`, compose path `deploy/portainer/backend/backend-stack.yml` ([README.md:8–11](../deploy/portainer/README.md)).
- Portainer cần đăng ký GHCR với token có quyền `read:packages` để pull image ([README.md:12–13](../deploy/portainer/README.md)).
- Biến triển khai ([README.md:20–25](../deploy/portainer/README.md)):

  ```dotenv
  IMAGE_REGISTRY=ghcr.io
  IMAGE_OWNER=lensexe
  IMAGE_TAG=latest
  BACKEND_PULL_POLICY=always
  ```

- Compose ghép tên image ([backend-stack.yml:7](../deploy/portainer/backend/backend-stack.yml)):

  ```yaml
  image: '${BACKEND_IMAGE:-${IMAGE_REGISTRY:-ghcr.io}/${IMAGE_OWNER:-lensexe}/lens-backend:${IMAGE_TAG:-latest}}'
  pull_policy: '${BACKEND_PULL_POLICY:-always}'
  ```

  Cú pháp `${A:-B}` nghĩa là "dùng A, nếu A rỗng thì dùng B". Có `BACKEND_IMAGE` thì dùng thẳng nó (chế độ image local import từ `.tar`, [README.md:29–39](../deploy/portainer/README.md)); không có thì ghép `ghcr.io/lensexe/lens-backend:latest`.

- `pull_policy: always` ([backend-stack.yml:8](../deploy/portainer/backend/backend-stack.yml)): mỗi lần deploy, Compose luôn hỏi registry xem tag có bản mới không. Đây là lý do tag `latest` dùng được: cùng một tên tag nhưng nội dung đã đổi, và `always` ép pull lại.
- Container có `restart: unless-stopped` ([backend-stack.yml:98](../deploy/portainer/backend/backend-stack.yml)), chỉ nối vào network external `lens-network` ([backend-stack.yml:96–103](../deploy/portainer/backend/backend-stack.yml)) và không publish port nào ra host ([README.md:41–45](../deploy/portainer/README.md)).
- Secret runtime (`DB_*`, `JWT_*`, `PAYOS_*`...) nằm trong environment của stack trên Portainer, được map vào container qua khối `environment` ([backend-stack.yml:9–95](../deploy/portainer/backend/backend-stack.yml)). Chúng **không** nằm trong image và **không** nằm trong GitHub Actions ([README.md:58–61](../deploy/portainer/README.md)).

### 13.2 Webhook

[README.md:47–50](../deploy/portainer/README.md): sau khi stack chạy healthy, vào stack settings, bật **GitOps updates**, chọn **Webhook**, bật **Re-pull image**, rồi lưu URL webhook vào secret GitHub `PORTAINER_WEBHOOK_URL`.

Theo [README.md:52–56](../deploy/portainer/README.md), khi webhook được gọi, Portainer:

1. checkout commit mới nhất của `master` (để lấy compose file mới, nếu có đổi),
2. pull lại image `latest`,
3. redeploy service.

Vì stack đọc compose file từ Git, sửa `deploy/portainer/backend/backend-stack.yml` rồi merge `master` cũng có hiệu lực ở lần webhook kế tiếp.

### 13.3 Stack AI worker

- Compose: [deploy/portainer/ai-worker/ai-worker-stack.yml](../deploy/portainer/ai-worker/ai-worker-stack.yml).
- Image ghép tương tự với biến `AI_WORKER_IMAGE` và `AI_WORKER_PULL_POLICY` (mặc định `always`) ([ai-worker-stack.yml:3–4](../deploy/portainer/ai-worker/ai-worker-stack.yml)).
- Một số biến bắt buộc, thiếu là Compose báo lỗi ngay khi deploy, nhờ cú pháp `${VAR:?message}`: `KAFKA_PASSWORD` (dòng 17), `REDIS_PASSWORD` (dòng 21), `POSTGRES_PASSWORD` (dòng 29, 34), `CHAT_SERVICE_AI_TOKEN` (dòng 37).
- Webhook riêng: secret `PORTAINER_AI_WORKER_WEBHOOK_URL` ([README.md:79–81](../deploy/portainer/README.md)).
- Thứ tự triển khai theo README: Ollama trước, chờ tải model xong, rồi mới tới worker ([README.md:73–75](../deploy/portainer/README.md)).

---
