import styles from './styles/Button.module.css'


/*==================== Project Button Component ==================== */
/**
 * ProjectButton Component
 *
 * A reusable button component for triggering actions related to projects (Only used for creating buttons in this case).
 *
 * Props:
 * - onClick  : Function to execute when the button is clicked.
 * - message  : Button label. Defaults to "Click Here" if not provided.
 *
 * Styling:
 * - Uses CSS classes from 'CreateProjectButton.module.css' for consistent styling.
 */
export default function ProjectButton({ onClick, message = "Click Here" }) {
  return (
    <button onClick={onClick} className={`${styles.button} ${styles.addProject}`}>
      {message}
    </button>
  );
}
