import styles from './Boards.module.css'

function Board(props){
    return (
        //You need to use className for a class in JSX
        //alt in an image is there if the image can't be displayed
        <div className={styles.board}>
      {props.image_url && (
        <img 
          className={styles.board_image} 
          src={props.image_url} 
          alt=""
          style={{ width: 50, height: 50, objectFit: "cover", marginBottom: 5 }} 
        />
      )}
        <p className = {styles.board_title} >Title: {props.title}</p>
        <p className = {styles.board_meta}>Number: {props.shot}</p>
        </div>
    );
}


export default Board;

