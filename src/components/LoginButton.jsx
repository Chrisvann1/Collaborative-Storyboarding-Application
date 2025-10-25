import styles from './LoginButton.module.css'
import { Link } from "react-router-dom";

function Button() {
    return(<Link to="/CreateProject" className={styles.button}>Log in</Link>);
}

export default Button