// import { TfiClose } from "react-icons/tfi";
// import Image from "next/image";
// import styles from './../../profile/activity/activity.module.css'

// // const ParticipantsDetails = ({ selectedTournament, setSelectedTournament }) => {
// const ParticipantsDetails = ({ selectedParticipant, setSelectedParticipant }) => {
//     if (!selectedParticipant) return null

//   return (
//     // <div className={styles.tournamentDetailsContainer}>
//     <div className={styles.tournamentDetailsContainer}>
//         <h3 className={styles.tournamentDetailsH3}>Tournament Details</h3>
//         <div className={styles.tournamentDetails}>
//           <div className={styles.contents}>
//             <div className={styles.tournamentRecord}>
//               <label>Tournament Name:</label>
//               <p>{selectedParticipant.name}</p>
//             </div>
            
//             <div className={styles.tournamentRecord}>
//               <label>Game:</label>
//               <p>{selectedParticipant.game}</p>
//             </div>
            
//             <div className={styles.tournamentRecord}>
//               <label>Type:</label>
//               <p>{selectedParticipant.type}</p>
//             </div>
            
//             <div className={styles.tournamentRecord}>
//               <label>Price:</label>
//               <p>{selectedParticipant.price}</p>
//             </div>
            
//             <div className={styles.tournamentRecord}>
//               <label>Status:</label>
//               <p>{selectedParticipant.status}</p>
//             </div>
            
//             <div className={styles.tournamentRecord}>
//               <label>Position:</label>
//               <p>{selectedParticipant.position}</p>
//             </div>
            
//             <div className={styles.tournamentRecord}>
//               <label>Date:</label>
//               <p>{selectedParticipant.date}</p>
//             </div>

//           </div>
//           <div className={styles.tournamentImage}>
//             <Image
//               src={selectedParticipant.src}
//               alt={selectedParticipant.name}
//             />
//           </div>
//         </div>
//         <button
//           onClick={() => setSelectedParticipant(null)}
//           className={styles.closeBTN}
//         >
//           <TfiClose className={styles.closeIcon} />
//         </button>      
//     </div>
//   )
// }

// export default ParticipantsDetails