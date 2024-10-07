'use client'

import Header from '@/components/header/Header'
import Sidebar from '@/components/sidebar/Sidebar'
import styles from './page.module.css'
import { signOut, useSession } from 'next-auth/react'
import Login from './login/page'

const page = () => {
  // const {data: session} = useSession();

  return (
    <>
      {session ? ( 
         <>
          <div className={styles.pageContainer}>
      <Header />

      <main className={styles.mainContainer}>
            <Sidebar />

            <div className={styles.rightPaneContainer}>
                <div className={styles.header}>
                    <h3>Home Page</h3>

                    <div className={styles.searchFilterContainer}>
                        Filter and Search
                    </div>
                </div>

                <div>
                    <button onClick={()=>signOut()} style={{backgroundColor:"red", padding:'1rem' }}>LOG OUT TEST</button>
                </div> 

            </div>
        </main>

    </div>
        </>
      ): (
        <Login/>
      )}
    </>
  )
}

export default page