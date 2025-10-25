import styles from './GeneralButton.module.css';

//These parameters are props - if you go to EditProject.jsx, this is where the actual values 
//are passed in. "Click Here" is a default value if there is not a message passed in
export default function GeneralButton({ onClick, message = "Click Here" }) {
  return (
    <button onClick={onClick} className={`${styles.button}`}>
      {message}
    </button>
  );
}