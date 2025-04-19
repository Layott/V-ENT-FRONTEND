'use client'

import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import EventsComponent from '@/components/events/EventsComponent';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './../tournaments/tournament.module.css'

const Events = () => {
  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />
        <EventsComponent />   
      </main>

      <BottomMenu />
      
    </div>
  )
}

export default Events