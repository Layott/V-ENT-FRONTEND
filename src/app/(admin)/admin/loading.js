import styles from './admin-loading.module.css'

export default function AdminLoading() {
  return (
    <div className={styles.shell}>
      <div className={styles.spinner} />
    </div>
  )
}
