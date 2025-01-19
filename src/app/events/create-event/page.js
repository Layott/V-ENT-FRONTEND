'use client'

import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import CreateEventComponent from '@/components/create-event-component/CreateEventComponent';
import styles from './create-tournament.module.css';

const EventCreation = () => {
  return (
    <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />

        <main className={styles.mainContainer}>
          <Sidebar />
          <CreateEventComponent />

        </main>
    </div>
  )
}

export default EventCreation