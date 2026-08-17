'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { CiSearch } from 'react-icons/ci'
import { BsThreeDots, BsChevronDown, BsChevronUp } from 'react-icons/bs'
import { LuUserPlus } from 'react-icons/lu'
import styles from './team-profile.module.css'

const ROLE_LABEL = {
  owner: 'Owner',
  captain: 'Captain',
  manager: 'Manager',
  member: 'Member',
  player: 'Player',
}

const ROLE_BADGE_CLASS = {
  owner: 'roleOwner',
  captain: 'roleCaptain',
  manager: 'roleManager',
  member: 'roleMember',
  player: 'roleMember',
}

const TeamProfileMembersTable = ({ team, isOwner, onToast }) => {
  const { data: session } = useSession()
  const [members, setMembers] = useState(team.members || [])
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState(null) // userId
  const [expanded, setExpanded] = useState(null) // userId for mobile cards

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      (m.username || '').toLowerCase().includes(q) ||
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q)
    )
  })

  const action = async (path, body) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && { Authorization: `Bearer ${session.user.sessionToken}` }),
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      return data
    } catch (err) {
      return { status: 'error', message: 'Network error' }
    }
  }

  const promote = async (m, role) => {
    setOpenMenu(null)
    const data = await action('/team/promote-member/', { team_id: team.id, user_id: m.user_id, role })
    if (data?.status === 'success') {
      setMembers((prev) => prev.map((x) => x.user_id === m.user_id ? { ...x, role } : x))
      onToast?.(`${m.full_name || m.username} promoted to ${role}`)
    } else {
      onToast?.(data?.message || 'Failed')
    }
  }

  const kick = async (m) => {
    setOpenMenu(null)
    const data = await action('/team/kick-member/', { team_id: team.id, user_id: m.user_id })
    if (data?.status === 'success') {
      setMembers((prev) => prev.filter((x) => x.user_id !== m.user_id))
      onToast?.(`${m.full_name || m.username} removed`)
    } else {
      onToast?.(data?.message || 'Failed')
    }
  }

  const fmtDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <section className={styles.panel}>
      <div className={styles.tableHeader}>
        <h3 className={styles.panelTitle}>Members <span className={styles.countPill}>{members.length}</span></h3>
        <div className={styles.tableHeaderActions}>
          <div className={styles.searchBar}>
            <CiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          {isOwner && (
            <button type="button" className={`${styles.headerCta} redBTN`}>
              <LuUserPlus /> Invite member
            </button>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className={styles.membersTableWrap}>
        <div className={`${styles.membersTableHeader} ${styles.tableRow}`}>
          <div>Member</div>
          <div>Role</div>
          <div>Joined</div>
          <div>Win-rate</div>
          {isOwner && <div className={styles.alignRight}>Actions</div>}
        </div>

        {filtered.length === 0 && (
          <p className={styles.stateText}>No members match.</p>
        )}

        {filtered.map((m) => (
          <div key={m.user_id} className={`${styles.membersTableRow} ${styles.tableRow}`}>
            <div className={styles.memberCell}>
              <div className={styles.memberAvatar}>
                {m.profile_pic ? (
                  <Image src={m.profile_pic} alt="" width={36} height={36} />
                ) : (
                  <div className={styles.avatarFallback} />
                )}
              </div>
              <div>
                <p className={styles.memberName}>{m.full_name || m.username}</p>
                <p className={styles.memberHandle}>@{m.username}</p>
              </div>
            </div>

            <div>
              <span className={`${styles.roleBadge} ${styles[ROLE_BADGE_CLASS[m.role] || 'roleMember']}`}>
                {ROLE_LABEL[m.role] || m.role || 'Member'}
              </span>
            </div>

            <div className={styles.cellMuted}>{fmtDate(m.joined_at)}</div>

            <div className={styles.cellWinrate}>
              <span className={styles.winrateValue}>{Math.round((m.win_rate || 0) * 100)}%</span>
              <div className={styles.winrateBar}>
                <div className={styles.winrateFill} style={{ width: `${Math.round((m.win_rate || 0) * 100)}%` }} />
              </div>
            </div>

            {isOwner && (
              <div className={styles.alignRight}>
                {m.role !== 'owner' ? (
                  <div className={styles.menuWrap}>
                    <button
                      type="button"
                      className={styles.menuBtn}
                      onClick={() => setOpenMenu(openMenu === m.user_id ? null : m.user_id)}
                    >
                      <BsThreeDots />
                    </button>
                    {openMenu === m.user_id && (
                      <div className={styles.menuDropdown}>
                        {m.role !== 'captain' && (
                          <button type="button" onClick={() => promote(m, 'captain')}>Promote to captain</button>
                        )}
                        {m.role !== 'manager' && (
                          <button type="button" onClick={() => promote(m, 'manager')}>Promote to manager</button>
                        )}
                        {m.role !== 'member' && (
                          <button type="button" onClick={() => promote(m, 'member')}>Set to member</button>
                        )}
                        <button type="button" className={styles.menuDanger} onClick={() => kick(m)}>Kick</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className={styles.cellMuted}>-</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile expandable cards */}
      <div className={styles.membersMobile}>
        {filtered.map((m) => (
          <div key={m.user_id} className={styles.memberMobileCard}>
            <div className={styles.memberMobileHeader} onClick={() => setExpanded(expanded === m.user_id ? null : m.user_id)}>
              <div className={styles.memberCell}>
                <div className={styles.memberAvatar}>
                  {m.profile_pic ? (
                    <Image src={m.profile_pic} alt="" width={36} height={36} />
                  ) : (
                    <div className={styles.avatarFallback} />
                  )}
                </div>
                <div>
                  <p className={styles.memberName}>{m.full_name || m.username}</p>
                  <p className={styles.memberHandle}>@{m.username}</p>
                </div>
              </div>
              <div className={styles.memberMobileRoleWrap}>
                <span className={`${styles.roleBadge} ${styles[ROLE_BADGE_CLASS[m.role] || 'roleMember']}`}>
                  {ROLE_LABEL[m.role] || m.role}
                </span>
                {expanded === m.user_id ? <BsChevronUp /> : <BsChevronDown />}
              </div>
            </div>

            {expanded === m.user_id && (
              <div className={styles.memberMobileBody}>
                <div className={styles.memberMobileRow}>
                  <span className={styles.cellMuted}>Joined</span>
                  <span>{fmtDate(m.joined_at)}</span>
                </div>
                <div className={styles.memberMobileRow}>
                  <span className={styles.cellMuted}>Win rate</span>
                  <span>{Math.round((m.win_rate || 0) * 100)}%</span>
                </div>
                {isOwner && m.role !== 'owner' && (
                  <div className={styles.memberMobileActions}>
                    <button type="button" className={styles.miniBtn} onClick={() => promote(m, 'captain')}>Promote to captain</button>
                    <button type="button" className={styles.miniBtn} onClick={() => promote(m, 'manager')}>Promote to manager</button>
                    <button type="button" className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={() => kick(m)}>Kick</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default TeamProfileMembersTable
