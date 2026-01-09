import styles from './styles/Boards.module.css'

/*==================== Board Component ==================== */
/**
 * Board Component
 *
 * Represents a single storyboard shot
 * Displays either a shot image or a placeholder if no image is provided,
 * along with the shot title.
 *
 * Props:
 * - image_url : string | null
 *     The URL of the shot's image. If null or undefined, a placeholder is displayed.
 *
 * - title : string
 *     The title or name of the shot, displayed below the image.
 *
 * Styling:
 * - The component uses CSS modules for styling (Boards.module.css).
 * - The placeholder uses the `image_placeholder` style for empty states (found in assets folder).
 */
function Board(props){
    return (
        <div className={styles.board}>
            <div className={styles.image_container}>
                {props.image_url ? (
                    <img 
                        className={styles.board_image} 
                        src={props.image_url} 
                        alt=""
                    />
                ) : (
                    <div className={styles.image_placeholder}></div>
                )}
            </div>
            <p className={styles.board_title}>Shot: {props.title}</p>
        </div>
    );
}

export default Board;
