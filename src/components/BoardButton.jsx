import styles from './styles/Button.module.css';

/*==================== Board Button Component ==================== */
/**
 * BoardButton Component
 *
 * A reusable button component used for board-related actions (ADD, DELETE, EDIT)
 * 
 * Props:
 * - onClick  : Function to execute when the button is clicked.
 * - message  : Button label. Defaults to "Click Here" if not provided.
 *
 * Styling:
 * - Uses CSS classes from 'Button.module.css' for consistent base button styling.
 */
export default function GeneralButton({ onClick, message = "Click Here", variant }) {
  const className = `${styles.button} ${variant ? styles[variant] : ""}`;

  return <button onClick={onClick} className={className}>{message}</button>;
}

