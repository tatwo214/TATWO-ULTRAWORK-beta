# TATWO-ULTRAWORK beta

[English](README.en.md) · [公開 OS 憲法](OS.md) · [安全政策](SECURITY.md)

**讓多個 AI 在同一套 Goal、架構、Plan、Loops、沙盒與驗收規則下協作。**

TATWO-ULTRAWORK beta 是 provider-neutral、local-first 的公開多模型協作層。
它不是另一個大型 Agent runtime，而是放在 AI 模型、CLI 與工具之上的治理與
Gateway 層。

> TATWO OS App 搭建中，未包含於此公開 beta。此倉庫只提供公開 OS 原則、
> CLI、MCP、Gateway、限制沙盒、合約與 Skill。

## 1. 產品定位與 beta 邊界

公開版包含：

- Goal-first TATWO Work OS 憲法。
- stdio MCP server 與 CLI。
- Codex、Claude、Grok CLI adapter 範例。
- OpenAI-compatible HTTP 與 generic command adapter。
- Docker 強限制沙盒。
- `$tatwo-ultrawork-beta` 公開 Skill。
- Goal、Context、Plan、Loop、alignment 與 Goal Judge 收據。

公開版不包含：

- 圖形 OS App 或其原始碼。
- 裝置控制、同步、更新或私人基建。
- 代管 Gateway、使用者帳號系統或秘密儲存。
- 任何私人專案、收據、路徑、模型評測或本機狀態。

## 2. TATWO OS 上位原則

```text
Goal Contract
→ Context / Architecture Discovery
→ Plan
→ Loops
→ Goal Judge
```

核心規則：

- Goal 是起點與終點。
- 脈絡先於規矩，架構先於方案。
- `identity > model brand`。
- Plan 必須解釋如何接回原專案閉環。
- Loops 綁定 `goalHash + planHash`，偏離即停止。
- AI 先查證，只把真正的偏好、權限與衝突交給人類。
- 執行完成不等於 Goal 通過；每項 criterion 都需要可回查證據。

完整規則見 [OS.md](OS.md)。

## 3. 五分鐘 Quick Start

需求：Node.js 20 以上。Docker 為選用；沒有 Docker 時仍可使用 OS、MCP、
Gateway text call 與 dry-run。

從固定 beta tag 安裝：

```bash
npx --yes github:tatwo214/TATWO-ULTRAWORK-beta#v0.1.0-beta.2 setup
```

確認：

```bash
tatwo-ultrawork-beta doctor --json
tatwo-ultrawork-beta tools --json
tatwo-ultrawork-beta smoke --json
```

所有外部模型 adapter 預設停用。請先檢查本地 state 內的 `adapters.json`，
只啟用已完成獨立登入與測試的 route，再重新執行 doctor。

預設安裝不會修改 Codex 或 Claude 設定。明示同意後才寫入：

```bash
tatwo-ultrawork-beta setup --configure-codex
tatwo-ultrawork-beta setup --configure-claude
```

也可從原始碼執行：

```bash
git clone https://github.com/tatwo214/TATWO-ULTRAWORK-beta.git
cd TATWO-ULTRAWORK-beta
npm test
node bin/tatwo-ultrawork-beta.mjs setup --dry-run --json
```

## 4. 支援平台與 provider

| 類型 | 支援方式 |
|---|---|
| Codex | 已登入的 Codex CLI command adapter |
| Claude | 已登入的 Claude CLI command adapter |
| Grok | 已登入的 Grok CLI command adapter |
| OpenAI-compatible | Responses-style HTTP adapter |
| 其他 AI | text-in/text-out generic command adapter |

Adapter 只使用 PATH 與明示設定，不直接解析供應商的 credential、session 或
browser profile。需要既有 CLI 登入的 adapter，只有在使用者明示
`inheritHome: true` 並啟用後才繼承 HOME。每次 dispatch 的工作目錄都是空的隔離
workspace，不是目前專案。詳細設定見 [docs/ADAPTERS.md](docs/ADAPTERS.md)。

## 5. 安全與沙盒

沙盒預設：

- 不掛載 HOME、provider config 或 Docker socket。
- network 關閉。
- 不自動安裝、不自動啟動、不自動 pull image。
- container root read-only，移除 Linux capabilities。
- 只允許 allowlist command。
- 拒絕 symlink escape、path escape 與 secret-like files。
- Docker 不存在時 fail closed，不降級成 unrestricted host execution。

詳見 [docs/SANDBOX.md](docs/SANDBOX.md)。

## 6. MCP 安裝

安裝後會產生 generic MCP 設定：

```json
{
  "mcpServers": {
    "tatwo-ultrawork-beta": {
      "command": "node",
      "args": ["<installed-runtime>/bin/tatwo-ultrawork-beta-mcp.mjs"]
    }
  }
}
```

Codex／Claude 使用明示 setup flag 安裝；其他 MCP client 複製上方設定並替換
runtime path。

## 7. 第一個多模型協作流程

CLI 可呼叫所有 MCP 工具：

```bash
tatwo-ultrawork-beta call tatwo.os.begin --input '{
  "outcome": "Review a small change with two AI engines",
  "criteria": ["implementation test passes", "independent review passes"],
  "nonGoals": ["production deployment"],
  "constraints": ["sandbox only"],
  "projectPrinciples": ["small verified changes"],
  "architectureAnchors": ["existing public API remains stable"],
  "protectedSurfaces": ["credentials and production state"]
}' --json
```

接著依序：

1. `tatwo.context.submit`
2. `tatwo.goal.confirm`
3. `tatwo.plan.issue`
4. `tatwo.loops.dispatch`
5. `tatwo.gateway.fanout`
6. `tatwo.goal.alignment.submit`
7. `tatwo.goal.close`

可用 `tatwo.os.next` 取得唯一最高影響的下一步或人類問題。

## 8. 架構與 adapter 開發

- [架構](docs/ARCHITECTURE.md)
- [Gateway adapters](docs/ADAPTERS.md)
- [沙盒](docs/SANDBOX.md)
- [公開 Skill](skills/tatwo-ultrawork-beta/SKILL.md)

## 9. 故障排除

### 找不到 AI CLI

先確認 CLI 已安裝並能在終端獨立完成一次登入後呼叫，再執行：

```bash
tatwo-ultrawork-beta doctor --json
```

### Docker 顯示 degraded

這不是 OS 或 Gateway 故障。TATWO 不會自行安裝或啟動 Docker；完成 Docker
設定後重新執行 `tatwo.sandbox.preflight`。

### Goal 無法建立 Plan

先確認 Goal 已由人類確認，而且 Context receipt 的 sufficiency 是
`sufficient`。缺少任一 gate 都會 fail closed。

## 10. Privacy、Security、License

- [Privacy](PRIVACY.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- Apache License 2.0，見 [LICENSE](LICENSE) 與 [NOTICE](NOTICE)。

請勿在 issue、receipt、adapter config 或示範資料中提交 API key、session、
cookie、私人路徑或真實專案內容。

## 11. OS App 狀態

圖形化 TATWO OS App 仍在搭建與 UX 驗證階段，因此沒有納入公開 beta。公開版先
讓使用者驗證 Work OS 原則、多模型 Gateway、MCP 協作與限制沙盒是否有價值。
