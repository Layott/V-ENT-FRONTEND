import styles from './progress-menu.module.css'

const ProgressMenu = ({ selectedTab, setSelectedTab }) => {
    const tabs = [
        { id: 1, label: 'Basic Info' },
        { id: 2, label: 'Format & Participants' },
        { id: 3, label: 'Prize Distribution' },
        { id: 4, label: 'Sponsors & Links' },
        { id: 5, label: 'Review' },
    ];

  return (
    <div className={styles.outerProgressMenuContainer}>
        <div className={styles.progressMenuContainer}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`${styles.progressBTN} ${
                        selectedTab === tab.id ? styles.activeTab : ''
                    }`}
                    onClick={() => setSelectedTab(tab.id)}
                >
                    <span className={styles.progressNumber}>{tab.id}</span>
                    {tab.label}
                </button>
            ))}
        </div>
    </div>
  )
}

export default ProgressMenu