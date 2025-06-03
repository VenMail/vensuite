export const RESUME_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Resume</title>
    <style>
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000000;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
        }
        
        page {
            display: block;
            width: 8.5in;
            min-height: 11in;
            padding: 0.75in;
            margin: 0 auto;
            background-color: #ffffff;
            box-sizing: border-box;
            page-break-after: always;
        }
        
        page:last-child {
            page-break-after: avoid;
        }
        
        .header {
            text-align: center;
            border-bottom: 2pt solid #2c3e50;
            padding-bottom: 12pt;
            margin-bottom: 18pt;
        }
        
        .name {
            font-size: 20pt;
            font-weight: bold;
            color: #2c3e50;
            margin: 0;
            letter-spacing: 1pt;
            text-transform: uppercase;
        }
        
        .contact-info {
            font-size: 10pt;
            color: #333333;
            margin-top: 8pt;
            line-height: 1.3;
        }
        
        .section {
            margin-bottom: 16pt;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 12pt;
            font-weight: bold;
            color: #2c3e50;
            border-bottom: 1pt solid #bdc3c7;
            padding-bottom: 3pt;
            margin-bottom: 10pt;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
        }
        
        .job-entry {
            margin-bottom: 14pt;
            page-break-inside: avoid;
        }
        
        .job-title {
            font-size: 11pt;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 3pt;
        }
        
        .company-info {
            font-size: 10pt;
            color: #666666;
            font-style: italic;
            margin-bottom: 6pt;
        }
        
        .achievement-list {
            margin: 0;
            padding-left: 18pt;
            list-style-type: disc;
        }
        
        .achievement-list li {
            margin-bottom: 4pt;
            font-size: 10pt;
            line-height: 1.4;
        }
        
        .education-item {
            margin-bottom: 10pt;
            page-break-inside: avoid;
        }
        
        .degree {
            font-weight: bold;
            color: #2c3e50;
            font-size: 11pt;
        }
        
        .university {
            color: #666666;
            font-size: 10pt;
            margin-top: 2pt;
        }
        
        .skills-section {
            display: block;
        }
        
        .skills-row {
            display: block;
            margin-bottom: 12pt;
        }
        
        .skill-category {
            font-weight: bold;
            color: #2c3e50;
            font-size: 10pt;
            margin-bottom: 4pt;
        }
        
        .skill-list {
            font-size: 10pt;
            line-height: 1.3;
            margin-left: 12pt;
        }
        
        .summary-text {
            font-size: 10pt;
            line-height: 1.5;
            text-align: justify;
            color: #333333;
        }
        
        @media print {
            page {
                margin: 0;
                box-shadow: none;
            }
        }
        
        @page {
            size: letter;
            margin: 0.75in;
        }
    </style>
</head>
<body>
    <page>
        <div class="header">
            <h1 class="name">Your Full Name</h1>
            <div class="contact-info">
                your.email@example.com | (555) 123-4567 | LinkedIn: linkedin.com/in/yourprofile<br>
                Your City, State 12345 | Portfolio: yourwebsite.com
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Professional Summary</h2>
            <p class="summary-text">
                Results-driven professional with [X]+ years of experience in [your field]. Proven track record of [key achievement with numbers]. 
                Expert in [core skills] with demonstrated ability to [specific accomplishment]. Seeking to leverage expertise in [relevant area] 
                to drive [specific outcomes] at [target company type].
            </p>
        </div>

        <div class="section">
            <h2 class="section-title">Professional Experience</h2>
            
            <div class="job-entry">
                <div class="job-title">Senior [Job Title]</div>
                <div class="company-info">[Company Name] | [City, State] | [Start Date] - Present</div>
                <ul class="achievement-list">
                    <li>Led [specific initiative] resulting in [quantifiable outcome, e.g., $X savings, Y% improvement]</li>
                    <li>Managed [team size/scope] across [departments/locations] to achieve [specific goal]</li>
                    <li>Implemented [system/process] that improved [metric] by [percentage/amount]</li>
                    <li>Collaborated with [stakeholders] to [accomplish specific objective]</li>
                    <li>Developed [program/strategy] that generated [measurable result]</li>
                </ul>
            </div>

            <div class="job-entry">
                <div class="job-title">[Previous Job Title]</div>
                <div class="company-info">[Company Name] | [City, State] | [Start Date] - [End Date]</div>
                <ul class="achievement-list">
                    <li>Achieved [specific accomplishment] through [method/approach]</li>
                    <li>Reduced [cost/time/errors] by [percentage] via [specific action]</li>
                    <li>Coordinated [project/initiative] involving [scope] and [stakeholders]</li>
                    <li>Analyzed [data/processes] to identify [opportunities] worth [value]</li>
                </ul>
            </div>

            <div class="job-entry">
                <div class="job-title">[Earlier Job Title]</div>
                <div class="company-info">[Company Name] | [City, State] | [Start Date] - [End Date]</div>
                <ul class="achievement-list">
                    <li>Supported [function/department] by [specific contributions]</li>
                    <li>Maintained [responsibility] with [performance metric]</li>
                    <li>Assisted in [project/initiative] that [outcome]</li>
                </ul>
            </div>
        </div>
    </page>
    
    <page>
        <div class="section">
            <h2 class="section-title">Education</h2>
            
            <div class="education-item">
                <div class="degree">[Degree Type] in [Field of Study]</div>
                <div class="university">[University Name] | [City, State] | [Graduation Year]</div>
                <div class="university">GPA: [X.XX] | Relevant Coursework: [Course 1], [Course 2], [Course 3]</div>
            </div>
            
            <div class="education-item">
                <div class="degree">[Additional Degree/Certification]</div>
                <div class="university">[Institution Name] | [Year]</div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Core Competencies</h2>
            <div class="skills-section">
                <div class="skills-row">
                    <div class="skill-category">Technical Skills:</div>
                    <div class="skill-list">
                        [Software 1] • [Software 2] • [Programming Language] • [Database Systems] • [Analytics Tools] • [Industry-Specific Software]
                    </div>
                </div>
                
                <div class="skills-row">
                    <div class="skill-category">Leadership & Management:</div>
                    <div class="skill-list">
                        Strategic Planning • Team Leadership • Project Management • Process Improvement • Change Management • Stakeholder Relations
                    </div>
                </div>
                
                <div class="skills-row">
                    <div class="skill-category">Industry Expertise:</div>
                    <div class="skill-list">
                        [Industry Knowledge 1] • [Industry Knowledge 2] • [Regulatory Knowledge] • [Market Analysis] • [Competitive Intelligence]
                    </div>
                </div>
                
                <div class="skills-row">
                    <div class="skill-category">Certifications:</div>
                    <div class="skill-list">
                        [Certification 1] • [Certification 2] • [Professional License] • [Industry Credential]
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Key Achievements</h2>
            <ul class="achievement-list">
                <li>Recipient of [Award Name] for [achievement] ([Year])</li>
                <li>Recognized as [Title/Recognition] for [accomplishment]</li>
                <li>Published [number] articles in [publication/journal] on [topic]</li>
                <li>Speaker at [Conference/Event] presenting on [subject] ([Year])</li>
            </ul>
        </div>
    </page>
</body>
</html>
`

export const LETTER_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Business Letter</title>
    <style>
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000000;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
        }
        
        page {
            display: block;
            width: 8.5in;
            min-height: 11in;
            padding: 1in;
            margin: 0 auto;
            background-color: #ffffff;
            box-sizing: border-box;
            page-break-after: always;
        }
        
        page:last-child {
            page-break-after: avoid;
        }
        
        .letterhead {
            text-align: center;
            border-bottom: 2pt solid #2c3e50;
            padding-bottom: 16pt;
            margin-bottom: 24pt;
        }
        
        .sender-name {
            font-size: 16pt;
            font-weight: bold;
            color: #2c3e50;
            margin: 0;
            letter-spacing: 1pt;
            text-transform: uppercase;
        }
        
        .sender-title {
            font-size: 11pt;
            color: #666666;
            font-style: italic;
            margin: 4pt 0;
        }
        
        .sender-contact {
            font-size: 10pt;
            color: #333333;
            margin-top: 8pt;
            line-height: 1.3;
        }
        
        .traditional-sender {
            text-align: left;
            margin-bottom: 24pt;
            display: none; /* Toggle this with letterhead */
        }
        
        .traditional-sender p {
            margin: 0;
            line-height: 1.3;
        }
        
        .date {
            text-align: right;
            margin-bottom: 32pt;
            font-weight: bold;
        }
        
        .recipient-address {
            margin-bottom: 24pt;
        }
        
        .recipient-address p {
            margin: 0;
            line-height: 1.3;
        }
        
        .recipient-name {
            font-weight: bold;
        }
        
        .salutation {
            margin-bottom: 16pt;
            font-weight: bold;
        }
        
        .subject-line {
            font-weight: bold;
            text-decoration: underline;
            margin: 16pt 0;
            text-align: center;
        }
        
        .letter-body {
            text-align: justify;
            margin-bottom: 24pt;
        }
        
        .letter-body p {
            margin-bottom: 12pt;
            text-indent: 0;
        }
        
        .highlight-box {
            background-color: #f8f9fa;
            border-left: 4pt solid #2c3e50;
            padding: 12pt;
            margin: 16pt 0;
            page-break-inside: avoid;
        }
        
        .closing {
            margin-top: 24pt;
        }
        
        .closing-phrase {
            margin-bottom: 48pt;
        }
        
        .signature-space {
            height: 48pt;
            border-bottom: 1pt solid #000000;
            width: 200pt;
            margin-bottom: 4pt;
        }
        
        .printed-name {
            font-weight: bold;
        }
        
        .enclosure {
            margin-top: 24pt;
            font-size: 10pt;
        }
        
        .reference-line {
            margin-top: 16pt;
            font-size: 10pt;
            color: #666666;
        }
        
        @media print {
            page {
                margin: 0;
                box-shadow: none;
            }
        }
        
        @page {
            size: letter;
            margin: 1in;
        }
    </style>
</head>
<body>
    <page>
        <!-- Professional Letterhead Option -->
        <div class="letterhead">
            <h1 class="sender-name">Your Full Name</h1>
            <div class="sender-title">Your Professional Title</div>
            <div class="sender-contact">
                123 Your Street Address, Suite 456 | Your City, State 12345<br>
                Phone: (555) 123-4567 | Email: your.email@example.com<br>
                LinkedIn: linkedin.com/in/yourprofile | Website: yourwebsite.com
            </div>
        </div>

        <!-- Alternative Traditional Format (uncomment to use instead of letterhead) -->
        <!--
        <div class="traditional-sender">
            <p>Your Full Name</p>
            <p>123 Your Street Address</p>
            <p>Your City, State 12345</p>
            <p>Phone: (555) 123-4567</p>
            <p>Email: your.email@example.com</p>
        </div>
        -->

        <div class="date">
            [Month Day, Year]
        </div>

        <div class="recipient-address">
            <p class="recipient-name">[Recipient Full Name]</p>
            <p>[Title/Position]</p>
            <p>[Company/Organization Name]</p>
            <p>[Street Address]</p>
            <p>[City, State ZIP Code]</p>
        </div>

        <div class="salutation">
            Dear [Mr./Ms./Dr. Last Name]:
        </div>

        <!-- Optional Subject Line -->
        <div class="subject-line">
            RE: [Subject of Your Letter]
        </div>

        <div class="letter-body">
            <p>
                <strong>Opening Paragraph:</strong> State your purpose clearly and directly. If this is a cover letter, mention the specific position and where you found it. If this is a business inquiry, state your request or proposal. Establish your credibility and connection to the recipient or organization.
            </p>

            <p>
                <strong>Body Paragraph:</strong> Provide detailed information that supports your purpose. For job applications, highlight your most relevant qualifications and achievements that align with the position requirements. Use specific examples with quantifiable results. For business correspondence, present your case with supporting evidence and clear reasoning.
            </p>

            <div class="highlight-box">
                <strong>Key Achievement/Value Proposition:</strong> In my previous role at [Company], I successfully [specific accomplishment] which resulted in [quantifiable benefit, e.g., 25% increase in efficiency, $500K cost savings, etc.]. This experience directly aligns with your needs for [relevant requirement].
            </div>

            <p>
                <strong>Supporting Paragraph:</strong> Continue building your case with additional relevant information. Address specific requirements mentioned in job postings or business contexts. Demonstrate your knowledge of the company/organization and explain how you can contribute to their goals and objectives.
            </p>

            <p>
                <strong>Closing Paragraph:</strong> Summarize your main points and restate your interest or request. Specify your desired next steps and indicate your availability for follow-up. Express enthusiasm and professionalism while maintaining appropriate formality.
            </p>
        </div>

        <div class="closing">
            <div class="closing-phrase">
                Sincerely,
            </div>
            
            <div class="signature-space"></div>
            <div class="printed-name">Your Full Name</div>
        </div>

        <!-- Optional Enclosures -->
        <div class="enclosure">
            Enclosures: Resume, Portfolio, References
        </div>

        <!-- Optional Reference Line -->
        <div class="reference-line">
            Reference: [Your Reference Number or Tracking Code]
        </div>
    </page>
</body>
</html>
`
