# TULONA Platform - Complete Activity Model Workflows

## Overview
This document outlines all activity models implemented in the TULONA financial comparison platform, following standard UML activity diagram patterns.

---

## 1. User Registration Activity Model

### Flow Diagram
```
[Start]
   ↓
[Click "Sign Up"]
   ↓
[Enter Name, Email, Phone]
   ↓
<Validation Check>
   ↓ Valid
[Generate 6-Digit OTP]
   ↓
[Send OTP to Email/Phone]
   ↓
[Display OTP Input Screen]
   ↓
[User Enters OTP]
   ↓
<OTP Verification>
   ├─ Invalid → [Show Error Message] → [Resend OTP Option]
   │
   ↓ Valid
[Set Password]
   ↓
<Password Strength Check>
   ↓ Strong
[Create User Account]
   ↓
[Store in Database]
   ↓
[Generate JWT Token]
   ↓
[Auto-Login User]
   ↓
[Redirect to Dashboard]
   ↓
[End]
```

### Implementation Details
- **Components**: AuthModal.jsx (Signup tab)
- **Steps**: 5 multi-step forms
- **Validation**: Email format, phone number, password strength
- **OTP**: 6-digit numeric code, 5-minute expiry
- **Storage**: LocalStorage for session persistence

---

## 2. User Login Activity Model

### Flow Diagram
```
[Start]
   ↓
[Click "Login"]
   ↓
[Enter Email/Phone and Password]
   ↓
<Credentials Validation>
   ├─ Invalid → [Show Error Message] → [Forgot Password Option]
   │
   ↓ Valid
[Query Database]
   ↓
<User Found?>
   ├─ No → [Show "User Not Found"]
   │
   ↓ Yes
<Password Match?>
   ├─ No → [Show "Invalid Password"]
   │
   ↓ Yes
[Generate JWT Token]
   ↓
[Store Token in LocalStorage]
   ↓
[Load User Profile Data]
   ↓
[Update Navbar (Show Profile Icon)]
   ↓
[Redirect to Dashboard/Homepage]
   ↓
[End]
```

### Implementation Details
- **Components**: AuthModal.jsx (Login tab)
- **Authentication**: JWT token-based
- **Session**: LocalStorage persistence
- **Redirect**: Automatic to dashboard on success

---

## 3. Product Comparison Activity Model

### Flow Diagram
```
[Start]
   ↓
[User Selects Category]
   ├─ Credit Cards
   ├─ Loans
   ├─ Deposits
   └─ Mobile Plans
   ↓
[Display Product List]
   ↓
[Apply Filters] ←──┐
   ├─ Bank/Provider │
   ├─ Product Type  │
   └─ Amount/Fee    │
   ↓                │
[View Filtered Results]
   ↓                │
<More Filters?> ──Yes
   ↓ No
[Select Product (Checkbox)]
   ↓
<Selection Count Check>
   ├─ > 4 → [Show "Max 4 Items Alert"]
   │
   ↓ ≤ 4
[Add to Comparison]
   ↓
<More Products?> ──Yes → [Select Another Product]
   ↓ No
[Generate Comparison Table]
   ↓
[Display Side-by-Side Features]
   ↓
[Render Comparison Charts]
   ├─ Bar Charts (Ratings, Rewards)
   ├─ Line Charts (EMI, Returns)
   └─ Doughnut Charts (Satisfaction)
   ↓
[User Reviews Features]
   ↓
<Apply for Product?>
   ├─ Yes → [Click Apply Button] → [Redirect to Bank Website]
   │
   ↓ No
<Compare Different Products?>
   ├─ Yes → [Deselect and Select New]
   │
   ↓ No
[End]
```

### Implementation Details
- **Pages**: CreditCardsPage, LoansPage, DepositsPage, MobilePlansPage
- **Selection Limit**: Maximum 4 items
- **Filters**: 3 levels per category
- **Charts**: Chart.js integration (8 total charts)
- **Comparison**: Dynamic table generation

---

## 4. User Profile Management Activity Model

### Flow Diagram
```
[Start - User Logged In]
   ↓
[Click Profile Icon]
   ↓
[Profile Dropdown Opens]
   ↓
[User Selects Action]
   ├─ My Profile ──────────────┐
   ├─ Settings ──────────────┐ │
   └─ Logout ────────────┐   │ │
                         ↓   │ │
              [Show Confirmation] │ │
                         ↓   │ │
              <Confirm Logout?>   │ │
              ├─ No → [Cancel]    │ │
              ↓ Yes               │ │
       [Clear LocalStorage]       │ │
              ↓                   │ │
       [Redirect to Homepage]     │ │
              ↓                   │ │
            [End]                 │ │
                                  │ │
              Settings Path ←─────┘ │
                         ↓           │
              [Display Settings Page]│
                         ↓           │
              [User Selects Tab]    │
              ├─ Update Profile ─┐  │
              └─ Change Password ┘  │
                         ↓           │
              [Edit Form Fields]    │
                         ↓           │
              [Click Save Button]   │
                         ↓           │
              <Validation Check>    │
              ├─ Invalid → [Show Errors]
              ↓ Valid               │
              [Update Database]     │
                         ↓           │
              [Show Success Message]│
                         ↓           │
              [Refresh User Data]   │
                         ↓           │
                      [End]          │
                                     │
              Profile Path ←─────────┘
                         ↓
              [Display Profile Page]
                         ↓
              [Show User Information]
              ├─ Name
              ├─ Email
              ├─ Phone
              └─ Member Since
                         ↓
              [Edit Profile Button]
                         ↓
              [Redirect to Settings]
                         ↓
                      [End]
```

### Implementation Details
- **Pages**: ProfilePage.jsx, SettingsPage.jsx
- **Components**: Profile dropdown in Navbar
- **Forms**: Update profile, Change password
- **Validation**: Client-side form validation
- **Feedback**: Success/error messages

---

## 5. Notification System Activity Model

### Flow Diagram
```
[Start - System Event Occurs]
   ↓
[Generate Notification]
   ├─ Offer (Credit Card Bonus)
   ├─ Update (Loan Approval)
   ├─ Alert (FD Maturity)
   └─ Info (New Feature)
   ↓
[Store in Notification List]
   ↓
<Is User Logged In?>
   ├─ No → [Queue for Later Delivery]
   │
   ↓ Yes
[Display Badge on Bell Icon]
   ↓
[Increment Unread Counter]
   ↓
[Wait for User Action]
   ↓
[User Clicks Bell Icon]
   ↓
[Open Notification Panel]
   ↓
[Display Notification List]
   ├─ Unread (Highlighted)
   └─ Read (Normal)
   ↓
[User Interacts]
   ├─ Click Notification ──────→ [Mark as Read]
   ├─ Click "Mark All Read" ───→ [Mark All as Read]
   └─ Click Delete Button ─────→ [Remove Notification]
   ↓
[Update Unread Counter]
   ↓
<More Actions?>
   ├─ Yes → [Continue Interacting]
   │
   ↓ No
[Close Panel]
   ↓
[End]
```

### Implementation Details
- **Component**: Notifications.jsx
- **Types**: 4 notification categories with icons
- **Features**: Mark read, delete, mark all read
- **Badge**: Real-time unread counter
- **Animation**: Slide-in from right

---

## 6. Chatbot Interaction Activity Model

### Flow Diagram
```
[Start]
   ↓
[Display Floating Chat Button]
   ↓
[User Clicks Chat Button]
   ↓
[Chat Window Slides Up]
   ↓
[Display Welcome Message]
   ↓
[Show Quick Question Buttons]
   ├─ "Show me credit cards"
   ├─ "Compare personal loans"
   ├─ "Best FD rates"
   └─ "Mobile plans"
   ↓
[User Interaction]
   ├─ Clicks Quick Question ─────┐
   └─ Types Custom Message ──────┤
                                  ↓
                    [Process User Input]
                                  ↓
                    [Keyword Matching]
                    ├─ "hello" / "hi"
                    ├─ "credit card"
                    ├─ "loan"
                    ├─ "deposit"
                    ├─ "mobile plan"
                    ├─ "help"
                    └─ "thanks" / "bye"
                                  ↓
                    <Match Found?>
                    ├─ No → [Default Response]
                    │
                    ↓ Yes
                    [Retrieve Predefined Response]
                                  ↓
                    [Display Bot Message]
                                  ↓
                    [Append to Chat History]
                                  ↓
                    <Continue Conversation?>
                    ├─ Yes → [Wait for Next Input]
                    │
                    ↓ No
                    [User Closes Chat]
                                  ↓
                    [Chat Window Slides Down]
                                  ↓
                    [Chat Button Remains]
                                  ↓
                               [End]
```

### Implementation Details
- **Component**: Chatbot.jsx
- **Position**: Fixed bottom-right corner
- **Responses**: 10+ predefined keyword-based responses
- **Quick Questions**: 4 popular queries
- **Chat History**: Message persistence during session
- **Animation**: Slide-up/down with fade

---

## 7. Filter & Search Activity Model

### Flow Diagram
```
[Start - On Comparison Page]
   ↓
[Display All Products]
   ↓
[User Selects Filter 1]
   ├─ Bank/Provider Selection
   ↓
[Apply Filter 1]
   ↓
[Update Product List]
   ↓
<More Filters?>
   ├─ Yes → [User Selects Filter 2]
   │         ├─ Product Type
   │         ↓
   │       [Apply Filter 2]
   │         ↓
   │       [Update Product List]
   │         ↓
   │       <More Filters?>
   │       ├─ Yes → [User Selects Filter 3]
   │       │         ├─ Amount/Fee Range
   │       │         ↓
   │       │       [Apply Filter 3]
   │       │         ↓
   │       │       [Update Product List]
   │       │
   │       ↓ No
   └───────┴───────────┐
                       ↓
              [Display Filtered Results]
                       ↓
              <Results Found?>
              ├─ No → [Show "No Products Match"]
              │
              ↓ Yes
              [User Reviews Products]
                       ↓
              <Reset Filters?>
              ├─ Yes → [Clear All Filters] → [Show All Products]
              │
              ↓ No
              [Proceed to Comparison]
                       ↓
                    [End]
```

### Implementation Details
- **Filters**: 3 levels per category
- **Logic**: useMemo for performance optimization
- **Real-time**: Instant filtering without page reload
- **Reset**: Clear all filters option available

---

## 8. Apply for Product Activity Model

### Flow Diagram
```
[Start - Product Selected]
   ↓
[User Reviews Product Details]
   ↓
[Clicks "Apply" Button]
   ↓
<User Logged In?>
   ├─ No → [Show Login Modal] → [User Logs In]
   │
   ↓ Yes
[Verify Eligibility]
   ├─ Income Requirements
   ├─ Age Requirements
   └─ Credit Score
   ↓
<Eligible?>
   ├─ No → [Show Eligibility Requirements]
   │
   ↓ Yes
[Display Application Confirmation]
   ↓
[User Confirms Application]
   ↓
<Confirmation?>
   ├─ No → [Cancel] → [Return to Comparison]
   │
   ↓ Yes
[Store Application Data]
   ↓
[Generate Application ID]
   ↓
[Send to Bank/Provider API]
   ↓
<External Redirect?>
   ├─ Yes → [Open Bank Website in New Tab]
   │
   ↓ No
[Create Internal Application]
   ↓
[Send Confirmation Email]
   ↓
[Display Success Message]
   ↓
[Show Application ID]
   ↓
[Add to User's Applications]
   ↓
[Create Notification]
   ↓
[End]
```

### Implementation Details
- **Button**: Apply/Subscribe button on each product
- **Validation**: Login requirement check
- **Redirect**: External bank website (future implementation)
- **Tracking**: Application history (future feature)

---

## Activity Model Summary

| Activity Model | Pages Involved | Components | Status |
|----------------|----------------|------------|--------|
| User Registration | AuthModal | Signup Form, OTP Input | ✅ |
| User Login | AuthModal | Login Form | ✅ |
| Product Comparison | 4 Comparison Pages | Cards, Tables, Charts | ✅ |
| Profile Management | Profile, Settings | Forms, Modals | ✅ |
| Notifications | Navbar | Notification Panel | ✅ |
| Chatbot | Global | Chat Window | ✅ |
| Filter & Search | All Comparison Pages | Filter Dropdowns | ✅ |
| Apply for Product | All Comparison Pages | Apply Buttons | ✅ |

---

## User Journey Examples

### Journey 1: New User Comparing Credit Cards
```
Visit Homepage → Sign Up → Verify OTP → Set Password → 
Login → Navigate to Credit Cards → Apply Filters (HDFC, Premium) → 
Select 4 Cards → View Comparison Table → Analyze Charts → 
Click Apply on Best Card → Redirect to Bank → Complete
```

### Journey 2: Existing User Checking Loan Options
```
Visit Homepage → Login → Navigate to Loans → 
Filter by Personal Loans → Select 3 Options → 
Compare Interest Rates & EMI → Check Chatbot for More Info → 
Apply for Lowest Rate Loan → Complete
```

### Journey 3: User Managing Profile
```
Login → Click Profile Icon → View Profile → 
Navigate to Settings → Update Phone Number → 
Change Password → Save Changes → Receive Notification → 
Logout → Complete
```

---

## Interaction Patterns

### 1. Authentication Pattern
- Modal-based signup/login
- Multi-step form navigation
- OTP verification flow
- Auto-login after registration

### 2. Comparison Pattern
- Filter → Browse → Select → Compare → Apply
- Maximum 4-item selection
- Real-time filtering
- Dynamic table generation

### 3. Notification Pattern
- Event triggers notification
- Badge counter updates
- Panel opens on click
- Mark read/delete actions

### 4. Chatbot Pattern
- Floating button always visible
- Click to open/close
- Quick question shortcuts
- Keyword-based responses

---

## Conclusion

All activity models have been successfully implemented in the TULONA platform, providing complete user flows for:

✅ Registration and Authentication  
✅ Product Comparison Across 4 Categories  
✅ Profile and Settings Management  
✅ Real-time Notifications  
✅ Interactive Chatbot Assistance  
✅ Advanced Filtering and Search  
✅ Product Application Process  

The platform follows industry-standard UX patterns and provides seamless user experiences across all workflows.

---

**Document**: Activity Model Workflows  
**Project**: TULONA Financial Comparison Platform  
**Version**: 1.0  
**Last Updated**: January 28, 2026
