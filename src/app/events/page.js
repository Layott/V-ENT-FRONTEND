'use client'

import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import EventsComponent from '@/components/events/EventsComponent';
import styles from './events.module.css'

const Events = () => {
  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />
        <EventsComponent />   
      </main>
    </div>
  )
}

export default Events