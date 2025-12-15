# 📧 R-Mail: Local Cold Email Outreach Tool

R-Mail is a powerful, privacy-focused cold email outreach application that runs entirely on your local machine. It allows you to manage campaigns, personalize templates, attach resumes, and track your history—all without paying monthly SaaS subscriptions.

## ✨ Features

-   **🏠 100% Local**: No cloud database or monthly fees. Your data stays on your computer.
-   **📩 Gmail Integration**: Send emails using your own Gmail account via simplified App Passwords.
-   **🔄 Smart Inbox**: Syncs your Gmail inbox to show *only* replies relevant to your campaigns.
-   **📄 Resume Attachment**: Upload your resume (PDF) once, and it automatically attaches to your campaign emails.
-   **✍️ Dynamic Templates**: Edit email templates using Jinja2 syntax (e.g., `{{ Name }}`) for personalization.
-   **📊 Campaign Management**: Create campaigns, upload CSV recipients, and track success.
-   **⭐ Starred & Drafts**: Manage important conversations directly from the app.

---

## 🚀 Getting Started

Follow these steps to set up R-Mail on your local machine.

### Prerequisites

-   **Python 3.8+**: [Download Here](https://www.python.org/downloads/)
-   **Node.js & npm**: [Download Here](https://nodejs.org/en/download/)

### 1. Installation

Clone the repository and install dependencies:

```bash
# Clone the project
git clone https://github.com/yourusername/r-mail.git
cd r-mail

# Install Backend requirements
pip install -r requirements.txt

# Install Frontend dependencies
npm install
```

### 2. Configuration (`.env`)

1.  Rename `.env.example` to `.env`:
    ```bash
    mv .env.example .env
    # Or on Windows PowerShell:
    # Rename-Item .env.example .env
    ```
2.  Open `.env` and fill in your details:

    ```ini
    SENDER_EMAIL=your.email@gmail.com
    APP_PASSWORD=xxxx xxxx xxxx xxxx
    SENDER_NAME=John Doe
    ```

    **🔍 How to get an App Password:**
    1.  Go to your [Google Account Security](https://myaccount.google.com/security) settings.
    2.  Enable **2-Step Verification**.
    3.  Search for "App passwords".
    4.  Create a new app password named "R-Mail".
    5.  Copy the 16-character code into your `.env` file.

### 3. Google OAuth Setup (For Inbox Sync)

To sync your inbox and read replies, you need a `client_secret.json` file from Google Cloud.

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a **New Project**.
3.  Enable the **Gmail API**.
4.  Go to **Credentials** → **Create Credentials** → **OAuth Client ID**.
    -   Application Type: **Desktop App**.
    -   Name: **R-Mail Desktop**.
5.  Download the JSON file.
6.  **Rename it** to `client_secret.json` and place it in the root folder of this project.

### 4. Running the App

You need two terminals open:

**Terminal 1 (Backend):**
```bash
python app.py
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

The app will open at `http://localhost:3000` (or `3001` if busy).

---

## 🛠️ Usage Guide

### 1. Dashboard & Inbox
-   Connect your Gmail account using the "Connect Gmail" button (requires `client_secret.json`).
-   Once connected, click "Sync Emails" to fetch recent replies and sent messages.
-   The inbox filters emails to help you focus on campaign responses.

### 2. Campaigns
-   Go to the **Campaigns** tab.
-   Click "Create Campaign".
-   Upload a CSV file with a `Email` column (and optional columns like `Name`, `Company` for personalization).
-   Set your campaign name and choose if you want to attach your uploaded resume.

### 3. Edit Template
-   Go to **Edit Template**.
-   Write your subject and body.
-   Use `{{ Name }}` or `{{ Company }}` to insert data from your CSV columns dynamically.

### 4. Profile & Resume
-   Go to **Profile**.
-   Upload your PDF resume.
-   This file will be securely stored locally and sent as an attachment when you enable it in a campaign.

---

## 🔒 Privacy & Security

-   **Local Data**: Your contacts, templates, and history are stored in `campaigns.json`, `emails.json`, and `sent_log.csv` on your computer.
-   **Direct Connection**: The app connects directly to Gmail's API. No middleman servers see your data.
-   **Open Source**: The code is open for you to inspect and modify.

---

