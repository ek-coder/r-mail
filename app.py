from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
from jinja2 import Template
import smtplib
import time
import random
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from dotenv import load_dotenv
from pathlib import Path
import json
from datetime import datetime
# Removed Gemini imports
# Removed PyPDF2 import
# Removed scraping imports
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import base64
from email import message_from_bytes
import email.utils

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Configuration
from werkzeug.utils import secure_filename
import re

# Configuration
UPLOAD_FOLDER = 'uploads'
RESUME_FOLDER = 'resumes'
CAMPAIGNS_FILE = 'campaigns.json'
EMAILS_FILE = 'emails.json'
DRAFTS_FOLDER = 'drafts'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESUME_FOLDER, exist_ok=True)
# Removed scraping constants
os.makedirs(DRAFTS_FOLDER, exist_ok=True)

# Email configuration
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
APP_PASSWORD = os.getenv("APP_PASSWORD")
SENDER_NAME = os.getenv("SENDER_NAME", "Lakshay")

# Removed Gemini AI configuration
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# if GEMINI_API_KEY:
#     genai.configure(api_key=GEMINI_API_KEY)

# Email sending configuration
DELAY_SECONDS_MIN = 4
DELAY_SECONDS_MAX = 8
BATCH_SIZE = 100
BATCH_BREAK_SECONDS = 300

# Gmail API configuration
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.modify']
CLIENT_SECRETS_FILE = 'client_secret.json'  # User needs to create this from Google Cloud Console
CREDENTIALS_FILE = 'gmail_credentials.json'

# Helper functions
def load_campaigns():
    if os.path.exists(CAMPAIGNS_FILE):
        with open(CAMPAIGNS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_campaigns(campaigns):
    with open(CAMPAIGNS_FILE, 'w') as f:
        json.dump(campaigns, f, indent=2)

def load_emails():
    """Load emails from storage"""
    if os.path.exists(EMAILS_FILE):
        with open(EMAILS_FILE, 'r') as f:
            return json.load(f)
    return {"inbox": [], "sent": [], "drafts": []}

def save_emails(emails_data):
    """Save emails to storage"""
    with open(EMAILS_FILE, 'w') as f:
        json.dump(emails_data, f, indent=2)

def get_gmail_service():
    """Get Gmail API service instance"""
    creds = None
    if os.path.exists(CREDENTIALS_FILE):
        creds = Credentials.from_authorized_user_file(CREDENTIALS_FILE, SCOPES)
    
    if not creds or not creds.valid:
        return None
    
    try:
        service = build('gmail', 'v1', credentials=creds)
        return service
    except Exception as e:
        print(f"Error building Gmail service: {e}")
        return None

def extract_template_subject_pattern():
    """Extract subject pattern from email template"""
    try:
        with open("email_template.txt", "r", encoding="utf-8") as f:
            template_content = f.read()
        # Extract subject line (first line after "Subject:")
        if "Subject:" in template_content:
            subject_line = template_content.split("Subject:")[1].split("\n")[0].strip()
            # Remove template variables to create pattern
            # Gmail search doesn't support regex, so we just use the static parts
            clean_subject = re.sub(r'\{\{.*?\}\}', ' ', subject_line)
            # Remove special characters that might confuse search
            clean_subject = re.sub(r'[^\w\s-]', ' ', clean_subject)
            # Remove extra whitespace
            pattern = ' '.join(clean_subject.split())
            return pattern
    except:
        pass
    return "Internship Application"

# AI functions removed
# def extract_text_from_pdf(pdf_path):
#     """Extract text from PDF file"""
#     try:
#         with open(pdf_path, 'rb') as file:
#             pdf_reader = PyPDF2.PdfReader(file)
#             text = ""
#             for page in pdf_reader.pages:
#                 text += page.extract_text()
#             return text
#     except Exception as e:
#         print(f"Error extracting PDF: {e}")
#         return ""

# def extract_resume_metadata_with_gemini(pdf_path):
#     """Extract resume metadata using Gemini AI"""
#     if not GEMINI_API_KEY:
#         return {
#             "name": "Not available",
#             "education": "Not available",
#             "skills": [],
#             "projects": [],
#             "interests": "Not available"
#         }
    
#     try:
#         # Extract text from PDF
#         resume_text = extract_text_from_pdf(pdf_path)
        
#         if not resume_text:
#             return None
        
#         # Use Gemini to extract metadata
#         model = genai.GenerativeModel('gemini-pro')
#         prompt = f"""Extract the following information from this resume text and return as JSON:
# {{
#     "name": "Full name",
#     "education": "College/University, Year, Major/Degree",
#     "skills": ["skill1", "skill2", ...],
#     "projects": ["project1 description", "project2 description", ...],
#     "interests": "Career interests or professional interests"
# }}

# Resume text:
# {resume_text[:3000]}

# Return only valid JSON, no additional text."""
        
#         response = model.generate_content(prompt)
#         result_text = response.text.strip()
        
#         response = model.generate_content(prompt)
#         result_text = response.text.strip()
        
#         # Robust JSON cleaning
#         try:
#             # Find the first '{' and last '}'
#             start_idx = result_text.find('{')
#             end_idx = result_text.rfind('}')
            
#             if start_idx != -1 and end_idx != -1:
#                 json_str = result_text[start_idx:end_idx+1]
#                 metadata = json.loads(json_str)
#             else:
#                 # If no JSON braces found, force empty structure
#                 raise ValueError("No JSON found in response")
                
#             return metadata
#         except Exception as e:
#             print(f"JSON parsing error: {str(e)}\nRaw text: {result_text}")
#             return {
#                 "name": "Extraction Failed",
#                 "education": "Could not extract",
#                 "skills": ["Manual entry required"],
#                 "projects": [],
#                 "interests": "Please upload again or edit manually"
#             }
#     except Exception as e:
#         print(f"Error extracting metadata with Gemini: {e}")
#         return {
#             "name": "Error extracting",
#             "education": "Error extracting",
#             "skills": [],
#             "projects": [],
#             "interests": "Error extracting"
#         }

def send_email_smtp(receiver_email, subject, body, attachment_path=None):
    """Send email via SMTP"""
    msg = MIMEMultipart()
    msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    msg["To"] = receiver_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    if attachment_path and os.path.exists(attachment_path):
        with open(attachment_path, "rb") as f:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(f.read())
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{Path(attachment_path).name}"')
        msg.attach(part)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(SENDER_EMAIL, APP_PASSWORD)
        server.sendmail(SENDER_EMAIL, receiver_email, msg.as_string())

# API Routes

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/api/resume/upload', methods=['POST'])
def upload_resume():
    """Upload resume and extract metadata"""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if file and file.filename.endswith('.pdf'):
        filename = secure_filename(file.filename)
        filepath = os.path.join(RESUME_FOLDER, filename)
        file.save(filepath)
        
        # Determine file size
        file_size = os.path.getsize(filepath)
        size_str = f"{file_size / 1024:.1f} KB"
        if file_size > 1024 * 1024:
            size_str = f"{file_size / (1024 * 1024):.1f} MB"
        
        return jsonify({
            "success": True,
            "filename": filename,
            "filepath": filepath,
            "size": size_str,
            "uploadedAt": datetime.now().isoformat()
        })
    
    return jsonify({"error": "Invalid file type. Only PDF allowed"}), 400

@app.route('/api/resume', methods=['GET'])
def get_resume():
    """Get current resume info"""
    resumes = [f for f in os.listdir(RESUME_FOLDER) if f.endswith('.pdf')]
    if resumes:
        latest_resume = max(resumes, key=lambda f: os.path.getmtime(os.path.join(RESUME_FOLDER, f)))
        filepath = os.path.join(RESUME_FOLDER, latest_resume)
        # metadata = extract_resume_metadata_with_gemini(filepath)
        file_size = os.path.getsize(filepath)
        size_str = f"{file_size / 1024:.1f} KB"
        
        return jsonify({
            "name": latest_resume,
            "size": size_str,
            "uploadedAt": datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat(),
            "metadata": None
        })

    return jsonify({"error": "No resume found"}), 404

@app.route('/api/resume/<filename>', methods=['DELETE'])
def delete_resume(filename):
    """Delete resume"""
    filepath = os.path.join(RESUME_FOLDER, secure_filename(filename))
    if os.path.exists(filepath):
        os.remove(filepath)
        return jsonify({"success": True})
    return jsonify({"error": "File not found"}), 404

@app.route('/api/campaigns', methods=['GET'])
def get_campaigns():
    """Get all campaigns"""
    campaigns = load_campaigns()
    return jsonify(campaigns)

@app.route('/api/campaigns', methods=['POST'])
def create_campaign():
    """Create a new campaign"""
    data = request.json
    campaigns = load_campaigns()
    
    new_campaign = {
        "id": int(time.time() * 1000),
        "name": data.get("name"),
        "recipients": data.get("recipients", []),
        "attachResume": data.get("attachResume", False),
        "status": "draft",
        "createdAt": datetime.now().isoformat(),
        "emails": [],
        "stats": {
            "total": len(data.get("recipients", [])),
            "sent": 0,
            "opened": 0,
            "replied": 0
        }
    }
    
    # Parse recipients if CSV/Excel uploaded
    if data.get("fileUploaded"):
        # In a real implementation, parse the uploaded file
        pass
    
    campaigns.append(new_campaign)
    save_campaigns(campaigns)
    
    return jsonify(new_campaign), 201

@app.route('/api/campaigns/<int:campaign_id>', methods=['GET'])
def get_campaign(campaign_id):
    """Get a specific campaign"""
    campaigns = load_campaigns()
    campaign = next((c for c in campaigns if c["id"] == campaign_id), None)
    if campaign:
        return jsonify(campaign)
    return jsonify({"error": "Campaign not found"}), 404

@app.route('/api/campaigns/<int:campaign_id>/send', methods=['POST'])
def send_campaign(campaign_id):
    """Send emails for a campaign"""
    campaigns = load_campaigns()
    campaign = next((c for c in campaigns if c["id"] == campaign_id), None)
    
    if not campaign:
        return jsonify({"error": "Campaign not found"}), 404
    
    if not SENDER_EMAIL or not APP_PASSWORD:
        return jsonify({"error": "Email credentials not configured"}), 500
    
    # Load template
    template_path = "email_template.txt"
    if not os.path.exists(template_path):
        return jsonify({"error": "Email template not found"}), 500
    
    with open(template_path, "r", encoding="utf-8") as f:
        template = Template(f.read())
    
    # Get resume path if needed
    resume_path = None
    if campaign.get("attachResume"):
        resumes = [f for f in os.listdir(RESUME_FOLDER) if f.endswith('.pdf')]
        if resumes:
            resume_path = os.path.join(RESUME_FOLDER, max(resumes, key=lambda f: os.path.getmtime(os.path.join(RESUME_FOLDER, f))))
    
    # Update campaign status
    campaign["status"] = "sending"
    save_campaigns(campaigns)
    
    sent_count = 0
    failed_count = 0
    
    # Send emails
    for recipient in campaign["recipients"]:
        # Parse recipient (could be email or dict with company info)
        if isinstance(recipient, dict):
            email = recipient.get("email", recipient.get("Email", ""))
            company = recipient.get("company", recipient.get("Company Name", ""))
            industry = recipient.get("industry", recipient.get("Industry", ""))
            position = recipient.get("position", recipient.get("Position", ""))
            location = recipient.get("location", recipient.get("Location", ""))
        else:
            email = str(recipient).strip()
            company = email.split("@")[0] if "@" in email else "Company"
            industry = ""
            position = ""
            location = ""
        
        if not email or "@" not in email:
            continue
        
        # Prepare template context
        context = {
            "company_name": company or "Team",
            "industry": industry or "your field",
            "position": position or "internship",
            "location": location or "",
            "interest": "AI and Web Development",
            "skills": "Python, Machine Learning, and Web Development"
        }
        
        rendered = template.render(**context)
        
        # Split subject and body
        if "\n\n" in rendered:
            subject_line, body = rendered.split("\n\n", 1)
        else:
            parts = rendered.split("\n", 1)
            subject_line = parts[0]
            body = parts[1] if len(parts) > 1 else ""
        
        subject = subject_line.replace("Subject:", "").strip()
        
        try:
            send_email_smtp(email, subject, body, resume_path if campaign.get("attachResume") else None)
            sent_count += 1
            campaign["stats"]["sent"] = sent_count
            
            # Log email
            email_record = {
                "id": int(time.time() * 1000) + sent_count,
                "recipient": email,
                "status": "sent",
                "sentAt": datetime.now().isoformat()
            }
            campaign["emails"].append(email_record)
            
            # Save to sent folder
            emails_data = load_emails()
            sent_email = {
                'id': int(time.time() * 1000) + sent_count,
                'subject': subject,
                'sender': SENDER_NAME,
                'email': email,
                'body': body,
                'preview': body[:100] + '...' if len(body) > 100 else body,
                'time': datetime.now().strftime('%b %d, %Y'),
                'date': datetime.now().isoformat(),
                'folder': 'sent',
                'read': True,
                'starred': False,
                'campaign_id': campaign_id
            }
            emails_data.setdefault('sent', []).insert(0, sent_email)
            save_emails(emails_data)
            
            # Delay between emails
            wait = random.uniform(DELAY_SECONDS_MIN, DELAY_SECONDS_MAX)
            time.sleep(wait)
            
        except Exception as e:
            failed_count += 1
            email_record = {
                "id": int(time.time() * 1000) + failed_count,
                "recipient": email,
                "status": "failed",
                "error": str(e),
                "sentAt": datetime.now().isoformat()
            }
            campaign["emails"].append(email_record)
    
    campaign["status"] = "completed"
    save_campaigns(campaigns)
    
    return jsonify({
        "success": True,
        "sent": sent_count,
        "failed": failed_count,
        "campaign": campaign
    })

@app.route('/api/campaigns/<int:campaign_id>', methods=['DELETE'])
def delete_campaign(campaign_id):
    """Delete a campaign"""
    campaigns = load_campaigns()
    campaigns = [c for c in campaigns if c["id"] != campaign_id]
    save_campaigns(campaigns)
    return jsonify({"success": True})

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Get analytics data"""
    campaigns = load_campaigns()
    
    total_campaigns = len(campaigns)
    total_sent = sum(c.get("stats", {}).get("sent", 0) for c in campaigns)
    total_opened = sum(c.get("stats", {}).get("opened", 0) for c in campaigns)
    total_replied = sum(c.get("stats", {}).get("replied", 0) for c in campaigns)
    
    return jsonify({
        "totalCampaigns": total_campaigns,
        "totalSent": total_sent,
        "totalOpened": total_opened,
        "totalReplied": total_replied,
        "openRate": (total_opened / total_sent * 100) if total_sent > 0 else 0,
        "replyRate": (total_replied / total_sent * 100) if total_sent > 0 else 0
    })

@app.route('/api/recipients/upload', methods=['POST'])
def upload_recipients():
    """Upload recipients CSV/Excel file"""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Read CSV or Excel
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(filepath)
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(filepath, engine='openpyxl')
            else:
                return jsonify({"error": "Unsupported file type. Use CSV or Excel files."}), 400
        except Exception as e:
            return jsonify({"error": f"Error reading file: {str(e)}"}), 400
        
        # Extract recipients
        recipients = []
        for _, row in df.iterrows():
            email = str(row.get("Email", row.get("email", ""))).strip()
            if email and "@" in email:
                recipient = {
                    "email": email,
                    "company": str(row.get("Company Name", row.get("company", ""))).strip(),
                    "industry": str(row.get("Industry", row.get("industry", ""))).strip(),
                    "position": str(row.get("Position", row.get("position", ""))).strip(),
                    "location": str(row.get("Location", row.get("location", ""))).strip()
                }
                recipients.append(recipient)
        
        return jsonify({
            "success": True,
            "recipients": recipients,
            "count": len(recipients)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Email scraping functions
# Scraping functions removed

@app.route('/api/template', methods=['GET'])
def get_template():
    """Get email template"""
    template_path = "email_template.txt"
    try:
        if os.path.exists(template_path):
            with open(template_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({"success": True, "content": content})
        else:
            return jsonify({"success": True, "content": ""})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/template', methods=['POST'])
def save_template():
    """Save email template"""
    data = request.json
    content = data.get('content', '')
    template_path = "email_template.txt"
    try:
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Gmail API Routes
@app.route('/api/gmail/auth', methods=['GET'])
def gmail_auth():
    """Initiate Gmail OAuth flow"""
    try:
        if not os.path.exists(CLIENT_SECRETS_FILE):
            error_msg = f"Gmail API credentials not found. Please:\n1. Go to Google Cloud Console\n2. Enable Gmail API\n3. Create OAuth 2.0 credentials\n4. Download as 'client_secret.json'\n5. Place it in: {os.path.abspath('.')}"
            print(f"ERROR: {error_msg}")
            return jsonify({"error": error_msg}), 400
        
        # Get redirect URI
        redirect_uri = request.host_url.rstrip('/') + '/api/gmail/callback'
        print(f"Using redirect URI: {redirect_uri}")
        
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    
    auth_url, _ = flow.authorization_url(prompt='consent')
    return jsonify({"auth_url": auth_url})

@app.route('/api/email/send', methods=['POST'])
def send_single_email():
    """Send a single email with optional attachments"""
    try:
        sender_email = os.getenv("SENDER_EMAIL")
        app_password = os.getenv("APP_PASSWORD")
        sender_name = os.getenv("SENDER_NAME", "R-Mail User")
        
        if not sender_email or not app_password:
            return jsonify({"error": "Email credentials not configured in .env"}), 400

        data = request.form
        to_email = data.get('to')
        subject = data.get('subject')
        body = data.get('body')
        
        if not to_email or not subject:
            return jsonify({"error": "Recipient and Subject are required"}), 400

        # Create message
        msg = MIMEMultipart()
        msg['From'] = f"{sender_name} <{sender_email}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        # Handle file attachments
        if 'files' in request.files:
            files = request.files.getlist('files')
            for file in files:
                if file.filename:
                    filename = secure_filename(file.filename)
                    # Use a temporary path if needed, or just read into memory
                    # For simplicity, we can read the stream directly
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(file.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {filename}',
                    )
                    msg.attach(part)

        # Send email via SMTP
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender_email, app_password)
            server.send_message(msg)
            
        # Log to sent_log.csv if it exists (optional, or create new log)
        # We can also add it to emails.json 'sent' list
        
        # Save to local storage (emails.json)
        emails_data = load_emails()
        new_email = {
            "id": f"sent_{int(time.time()*1000)}",
            "sender": "Me",
            "subject": subject,
            "preview": body[:50] + "..." if len(body) > 50 else body,
            "time": datetime.now().strftime("%I:%M %p"),
            "read": True,
            "starred": False,
            "folder": "sent",
            "body": body
        }
        emails_data['sent'].insert(0, new_email)
        save_emails(emails_data)

        return jsonify({"success": True, "message": "Email sent successfully"})

    except Exception as e:
        print(f"Error sending email: {e}")
        return jsonify({"error": str(e)}), 500        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'  # Force consent screen to get refresh token
        )
        
        print(f"Authorization URL generated successfully")
        return jsonify({
            "auth_url": authorization_url,
            "state": state
        })
    except FileNotFoundError:
        error_msg = f"File not found: {CLIENT_SECRETS_FILE}. Please add client_secret.json to the project root."
        print(f"ERROR: {error_msg}")
        return jsonify({"error": error_msg}), 400
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Gmail auth error: {error_details}")
        return jsonify({"error": f"Failed to initiate Gmail authentication: {str(e)}"}), 500

@app.route('/api/gmail/callback', methods=['GET'])
def gmail_callback():
    """Handle Gmail OAuth callback"""
    try:
        code = request.args.get('code')
        state = request.args.get('state')
        error = request.args.get('error')
        
        if error:
            return jsonify({"error": f"Authorization failed: {error}"}), 400
        
        if not code:
            return jsonify({"error": "Authorization code not provided"}), 400
        
        redirect_uri = request.host_url.rstrip('/') + '/api/gmail/callback'
        print(f"Callback received. Redirect URI: {redirect_uri}")
        
        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        
        flow.fetch_token(code=code)
        creds = flow.credentials
        
        # Save credentials
        with open(CREDENTIALS_FILE, 'w') as token:
            token.write(creds.to_json())
        
        print("Gmail credentials saved successfully")
        # Redirect to frontend with success message
        frontend_url = request.host_url.replace(':5001', ':3000').rstrip('/')
        return f'<html><body><script>window.opener.postMessage({{type: "gmail_connected", success: true}}, "*"); window.close();</script><p>Gmail connected successfully! You can close this window.</p></body></html>', 200
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Gmail callback error: {error_details}")
        return jsonify({"error": f"Failed to complete Gmail authentication: {str(e)}"}), 500

@app.route('/api/gmail/status', methods=['GET'])
def gmail_status():
    """Check if Gmail is connected"""
    service = get_gmail_service()
    if service:
        try:
            profile = service.users().getProfile(userId='me').execute()
            return jsonify({
                "connected": True,
                "email": profile.get('emailAddress', '')
            })
        except:
            return jsonify({"connected": False})
    return jsonify({"connected": False})

@app.route('/api/emails/sync', methods=['POST'])
def sync_emails():
    """Fetch emails from Gmail matching template subject"""
    service = get_gmail_service()
    if not service:
        return jsonify({"error": "Gmail not connected"}), 401
    
    try:
        emails_data = load_emails()
        subject_pattern = extract_template_subject_pattern()
        
        # Search for emails with matching subject
        query = f'subject:"{subject_pattern}"'
        
        # Get messages
        results = service.users().messages().list(userId='me', q=query, maxResults=50).execute()
        messages = results.get('messages', [])
        
        new_emails = []
        sent_emails = []
        
        for msg in messages:
            try:
                message = service.users().messages().get(userId='me', id=msg['id'], format='full').execute()
                
                headers = message['payload'].get('headers', [])
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
                sender = next((h['value'] for h in headers if h['name'] == 'From'), '')
                to = next((h['value'] for h in headers if h['name'] == 'To'), '')
                date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
                
                # Parse date
                try:
                    parsed_date = email.utils.parsedate_to_datetime(date)
                    formatted_date = parsed_date.strftime('%b %d, %Y') if parsed_date else date
                except:
                    formatted_date = date
                
                # Extract body
                body = ''
                if 'parts' in message['payload']:
                    for part in message['payload']['parts']:
                        if part['mimeType'] == 'text/plain':
                            data = part['body']['data']
                            body = base64.urlsafe_b64decode(data).decode('utf-8')
                            break
                elif message['payload'].get('body', {}).get('data'):
                    data = message['payload']['body']['data']
                    body = base64.urlsafe_b64decode(data).decode('utf-8')
                
                # Determine if it's sent or received using Gmail labels
                label_ids = message.get('labelIds', [])
                is_sent = 'SENT' in label_ids
                
                email_obj = {
                    'id': message['id'],
                    'gmail_id': message['id'],
                    'subject': subject,
                    'sender': sender.split('<')[0].strip() if '<' in sender else sender,
                    'email': sender.split('<')[1].split('>')[0] if '<' in sender else sender,
                    'body': body,
                    'preview': body[:100] + '...' if len(body) > 100 else body,
                    'time': formatted_date,
                    'date': date,
                    'folder': 'sent' if is_sent else 'inbox',
                    'read': 'UNREAD' not in message.get('labelIds', []),
                    'starred': 'STARRED' in message.get('labelIds', []),
                    'threadId': message.get('threadId', '')
                }
                
                if is_sent:
                    sent_emails.append(email_obj)
                else:
                    new_emails.append(email_obj)
                    
            except Exception as e:
                print(f"Error processing message {msg['id']}: {e}")
                continue
        
        # Merge with existing emails (avoid duplicates)
        existing_ids = {e.get('gmail_id') for e in emails_data.get('inbox', []) + emails_data.get('sent', [])}
        
        for email_obj in new_emails:
            if email_obj['gmail_id'] not in existing_ids:
                emails_data.setdefault('inbox', []).append(email_obj)
        
        for email_obj in sent_emails:
            if email_obj['gmail_id'] not in existing_ids:
                emails_data.setdefault('sent', []).append(email_obj)
        
        save_emails(emails_data)
        
        return jsonify({
            "success": True,
            "synced": len(new_emails) + len(sent_emails),
            "inbox": len(new_emails),
            "sent": len(sent_emails)
        })
        
    except HttpError as e:
        return jsonify({"error": f"Gmail API error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/emails', methods=['GET'])
def get_emails():
    """Get all emails"""
    folder = request.args.get('folder', 'inbox')
    emails_data = load_emails()
    return jsonify(emails_data.get(folder, []))

@app.route('/api/emails/<email_id>/star', methods=['POST'])
def toggle_star_email(email_id):
    """Toggle star status of an email"""
    service = get_gmail_service()
    emails_data = load_emails()
    
    # Find email in all folders
    email_obj = None
    folder = None
    for f in ['inbox', 'sent', 'drafts']:
        for e in emails_data.get(f, []):
            if e.get('id') == email_id or e.get('gmail_id') == email_id:
                email_obj = e
                folder = f
                break
        if email_obj:
            break
    
    if not email_obj:
        return jsonify({"error": "Email not found"}), 404
    
    # Toggle star
    new_starred = not email_obj.get('starred', False)
    email_obj['starred'] = new_starred
    
    # Update in Gmail if connected
    if service and email_obj.get('gmail_id'):
        try:
            if new_starred:
                service.users().messages().modify(
                    userId='me',
                    id=email_obj['gmail_id'],
                    body={'addLabelIds': ['STARRED']}
                ).execute()
            else:
                service.users().messages().modify(
                    userId='me',
                    id=email_obj['gmail_id'],
                    body={'removeLabelIds': ['STARRED']}
                ).execute()
        except:
            pass  # Continue even if Gmail update fails
    
    save_emails(emails_data)
    return jsonify({"success": True, "starred": new_starred})

@app.route('/api/emails/<email_id>/read', methods=['POST'])
def toggle_read_email(email_id):
    """Toggle read status of an email"""
    emails_data = load_emails()
    
    # Find email in all folders
    email_obj = None
    for f in ['inbox', 'sent', 'drafts']:
        for e in emails_data.get(f, []):
            if e.get('id') == email_id or e.get('gmail_id') == email_id:
                email_obj = e
                break
        if email_obj:
            break
    
    if not email_obj:
        return jsonify({"error": "Email not found"}), 404
    
    # Toggle read
    email_obj['read'] = not email_obj.get('read', False)
    save_emails(emails_data)
    return jsonify({"success": True, "read": email_obj['read']})

@app.route('/api/compose/send', methods=['POST'])
def send_composed_email():
    """Send email from compose window"""
    data = request.json
    to = data.get('to', '')
    subject = data.get('subject', '')
    body = data.get('body', '')
    attachments = data.get('attachments', [])  # Array of file paths
    
    if not to or not subject:
        return jsonify({"error": "To and Subject are required"}), 400
    
    if not SENDER_EMAIL or not APP_PASSWORD:
        return jsonify({"error": "Email credentials not configured"}), 500
    
    try:
        # Create email message
        msg = MIMEMultipart()
        msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        
        # Add attachments
        for attachment_path in attachments:
            if os.path.exists(attachment_path):
                with open(attachment_path, "rb") as f:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header("Content-Disposition", f'attachment; filename="{Path(attachment_path).name}"')
                msg.attach(part)
        
        # Send email
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to, msg.as_string())
        
        # Save to sent folder
        emails_data = load_emails()
        sent_email = {
            'id': int(time.time() * 1000),
            'subject': subject,
            'sender': SENDER_NAME,
            'email': to,
            'body': body,
            'preview': body[:100] + '...' if len(body) > 100 else body,
            'time': datetime.now().strftime('%b %d, %Y'),
            'date': datetime.now().isoformat(),
            'folder': 'sent',
            'read': True,
            'starred': False
        }
        emails_data.setdefault('sent', []).insert(0, sent_email)
        save_emails(emails_data)
        
        return jsonify({"success": True, "message": "Email sent successfully"})
        
    except Exception as e:
        # Save to drafts on failure
        emails_data = load_emails()
        draft = {
            'id': int(time.time() * 1000),
            'subject': subject,
            'to': to,
            'body': body,
            'attachments': attachments,
            'time': datetime.now().strftime('%b %d, %Y'),
            'folder': 'drafts',
            'error': str(e)
        }
        emails_data.setdefault('drafts', []).insert(0, draft)
        save_emails(emails_data)
        
        return jsonify({"error": f"Failed to send email: {str(e)}"}), 500

@app.route('/api/compose/upload', methods=['POST'])
def upload_compose_attachment():
    """Upload attachment for compose window"""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, f"compose_{int(time.time())}_{filename}")
        file.save(filepath)
        
        return jsonify({
            "success": True,
            "filepath": filepath,
            "filename": filename
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/drafts', methods=['GET'])
def get_drafts():
    """Get all drafts"""
    emails_data = load_emails()
    return jsonify(emails_data.get('drafts', []))

@app.route('/api/drafts/<draft_id>', methods=['DELETE'])
def delete_draft(draft_id):
    """Delete a draft"""
    emails_data = load_emails()
    drafts = emails_data.get('drafts', [])
    emails_data['drafts'] = [d for d in drafts if str(d.get('id')) != str(draft_id)]
    save_emails(emails_data)
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(debug=True, port=5001)

