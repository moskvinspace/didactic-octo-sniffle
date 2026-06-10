# AI Form-Filling Test Site

A static multi-page HTML form built in GDS Design System style for testing AI form-filling agents. No build step, no server, no framework — pure HTML5 + vanilla JS.

## Live URL

```
https://moskvinspace.github.io/didactic-octo-sniffle/
```

## Deploying to GitHub Pages

1. Push this repository to `github.com/moskvinspace/didactic-octo-sniffle`
2. Go to **Settings → Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose **Branch: `main`**, folder **`/ (root)`**
5. Click **Save** — the site is live in ~60 seconds at the URL above

The `.nojekyll` file at the root prevents GitHub Pages from running Jekyll processing.

## Page flow

```
index.html → page1.html → page2.html → page3.html → page4.html → page5.html → review.html
```

| File | Section | Fields |
|------|---------|--------|
| `page1.html` | Personal details | Full name, Date of birth (day / month / year) |
| `page2.html` | Contact details | Email, Phone number, Postcode |
| `page3.html` | Employment status | Radio: Employed / Self-employed / Unemployed / Student |
| `page4.html` | Document details | Select: document type; Text: reference number |
| `page5.html` | Additional info | Checkboxes: job offer / sponsor / previous visa / none |
| `review.html` | Check your answers | Summary table + disabled Submit button |

Data is persisted between pages via `sessionStorage`. The **Change** links on the review page return the user to the relevant page with `?change=true`, after which the Continue button skips back to `review.html` directly.

## Sample `task.json` for an AI agent

Point the agent at `page1.html` and supply this Q&A data covering every field:

```json
{
  "start_url": "https://moskvinspace.github.io/didactic-octo-sniffle/page1.html",
  "description": "Fill in the multi-page residency application form and reach the review page.",
  "form_data": {
    "fullname": "Jane Smith",
    "dob-day": "15",
    "dob-month": "6",
    "dob-year": "1990",
    "email": "jane.smith@example.com",
    "phone": "+44 7700 900123",
    "postcode": "EC1A 1BB",
    "employment": "Employed",
    "doc-type": "Passport",
    "doc-ref": "123456789",
    "apply": ["Has a job offer", "Has a sponsor"]
  },
  "success_condition": {
    "url_contains": "review.html",
    "page_contains": "Check your answers"
  }
}
```

### Field-to-selector map (for agent configuration)

| Field | Selector type | Selector value |
|-------|--------------|----------------|
| Full name | `id` | `fullname` |
| Day of birth | `id` | `dob-day` |
| Month of birth | `id` | `dob-month` |
| Year of birth | `id` | `dob-year` |
| Email | `id` | `email` |
| Phone | `id` | `phone` |
| Postcode | `id` | `postcode` |
| Employment (radio) | `name` + `value` | `employment` = `Employed` \| `Self-employed` \| `Unemployed` \| `Student` |
| Document type (select) | `id` | `doc-type` |
| Document reference | `id` | `doc-ref` |
| Checkboxes (apply) | `id` | `apply-job-offer`, `apply-sponsor`, `apply-previous-visa`, `apply-none` |
| Continue button | `type` | `submit` (one per page) |
