# 📸 Screenshot Upload Guide

## Screenshots to Replace

The following placeholder files need to be replaced with actual screenshots:

### 1. `screenshots/ai-health-copilot.png`
- **Source**: First image you provided
- **Description**: AI Health Copilot chat interface showing the welcome message and capabilities
- **Shows**: Interactive chat with health AI assistant, purple/blue theme

### 2. `screenshots/health-insights.png`  
- **Source**: Second image you provided
- **Description**: Health Insights dashboard with AI analysis
- **Shows**: Sleep optimization, hydration trends, and future health projections

### 3. `screenshots/future-me-simulator.png`
- **Source**: Third image you provided  
- **Description**: Future-Me health projections popup
- **Shows**: 30-day health score projection with detailed breakdown

### 4. `screenshots/decision-intelligence.png`
- **Source**: Fourth image you provided
- **Description**: Decision Intelligence Hub popup
- **Shows**: AI-powered decision recommendations with priority ranking

### 5. `screenshots/authentication-portal.png`
- **Source**: Fifth image you provided
- **Description**: Login/authentication interface
- **Shows**: Split-screen design with demo mode and sign-in forms

### 6. `screenshots/main-dashboard.png`
- **Source**: Sixth image you provided
- **Description**: Main health dashboard with metrics
- **Shows**: Health score, sleep quality, hydration, and activity cards

### 7. `screenshots/health-analytics.png`
- **Source**: Seventh image you provided
- **Description**: Detailed health analytics popup
- **Shows**: Advanced health pattern analysis with trends and insights

## How to Replace Screenshots

### Option 1: Upload via GitHub Web Interface
1. Go to https://github.com/NandiniSharma2-2/ATLAS/tree/main/screenshots
2. Click on each placeholder file
3. Click "Edit this file" (pencil icon)
4. Delete the placeholder text
5. Upload your actual screenshot image
6. Commit the changes

### Option 2: Use Git Commands
```bash
# Navigate to screenshots directory
cd screenshots

# Remove placeholder and add actual image
rm ai-health-copilot.png
# Add your actual image file here
git add ai-health-copilot.png
git commit -m "Add AI Health Copilot screenshot"
git push

# Repeat for all screenshots
```

### Option 3: Replace Locally and Push
1. Replace each placeholder file with the actual screenshot
2. Ensure filenames match exactly
3. Run:
```bash
git add screenshots/
git commit -m "Add all ATLAS screenshots"
git push
```

## Image Specifications
- **Format**: PNG (recommended) or JPG
- **Resolution**: High quality (1920x1080 or higher recommended)
- **File Size**: Keep under 5MB per image for GitHub
- **Naming**: Use exact filenames as listed above

## Verification
After uploading, verify that:
- [ ] All 7 screenshots are properly displayed in the README
- [ ] Images load correctly on the GitHub repository page  
- [ ] File sizes are reasonable (under 5MB each)
- [ ] Images maintain their quality and clarity

The README.md file is already configured to display these screenshots with proper descriptions and formatting.