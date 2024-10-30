'use client'

import Header from '@/components/header/Header'
import Sidebar from '@/components/sidebar/Sidebar'
import styles from './page.module.css'
import { signOut, useSession } from 'next-auth/react'
import Landing from './landing/page'

const Page = () => {
  const { data: session } = useSession();

  // Access the session ID or session token
  if (session) {
    console.log("Session Data:", session); // Log the full session object to inspect what data is available
    const sessionId = session?.id || session?.sessionToken; // Adjust based on how session ID is stored
    // console.log("This is the Session ID/Token:", sessionId);
  }

  return (
    <>
      {session ? ( <Landing />) : (
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

                {/* Logout button */}
                <div>
                  {/* <button
                    onClick={() => signOut()}
                    style={{ backgroundColor: 'red', padding: '1rem' }}
                  >
                    LOG OUT TEST
                  </button> */}
                </div>
              </div>
            </main>
          </div>
        </>
      )}

    </>
  );
};

export default Page;
