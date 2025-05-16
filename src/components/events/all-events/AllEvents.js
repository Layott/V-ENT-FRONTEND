
import FIFAEvents from './fifa-events/FIFAEvents';
import PUBGEvents from './pubg-events/PUBGEvents';
import FortniteEvents from './fortnite-events/FortniteEvents';
import MinecraftEvents from './minecraft-events/MinecraftEvents';
import FreeFireEvents from './freefire-events/FreeFireEvents';
import styles from './all-events.module.css'

const AllEvents = () => {
  return (
    <div className={styles.allTournamentsSlidersContainer}>

<FreeFireEvents />
        <FIFAEvents />
        <PUBGEvents />
        <FortniteEvents />
        <MinecraftEvents />
        
    </div>

  )
}

export default AllEvents