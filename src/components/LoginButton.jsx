/**
 * Button Component
 *
 * A button that navigates the user to the
 * "Create Project" page when clicked.
 *
 * Implementation:
 * - Uses React Router's <Link> for client-side navigation.
 * - Clicking the button routes the user to "/CreateProject".
 *
 * Styling:
 * - Styling is applied via a CSS module ('LoginButton.module.css').
 */
import styles from './styles/LoginButton.module.css';
import { Link } from "react-router-dom";

function Button() {
  return (
    <Link to="/CreateProject" className={styles.button}>
      Start Storyboarding
    </Link>
  );
}

export default Button;
