import Button from "../components/LoginButton.jsx"

/**
 * Login Page Component
 *
 * The main login screen for the storyboarding application
 * - Displays the app title, description, and a large button

 * Structure:
 * - login_container: Top-level container for the page.
 * - login_content: Centers and structures the page content.
 * - login_header: Contains the app title and tagline information.
 * - login_button_margin: Provides spacing around the login button.
 *
 */

export default function Login() {
  return (
    <div className="login_container">
      <div className="login_content">
        {/* Header with app title */}
        <div className="login_header">
          <h1 className="app_title">🎬 Shot Sync</h1>
          <p className="app_tagline">Real-time collaborative storyboarding</p>
          <p className="app_tagline">Perfect for film, video, and animation projects.</p>
        </div>
        
        {/* login button */}
        <div className="login_button_margin">
          <Button>Start Storyboarding</Button>
        </div>
      </div>
    </div>
  )
}