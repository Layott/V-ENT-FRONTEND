'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { CiSearch } from 'react-icons/ci'
import { TiArrowSortedDown } from 'react-icons/ti'
import { LuTrendingUp, LuTrendingDown, LuMinus, LuMapPin, LuCrown, LuMedal } from 'react-icons/lu'
import { HiOutlineTrophy } from 'react-icons/hi2'
import { GoDotFill } from 'react-icons/go'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import styles from './ranking.module.css'
import useGames from '@/hooks/useGames';

const TABS = [
  { id: 'players', label: 'Players' },
  { id: 'teams', label: 'Teams' },
  { id: 'organizations', label: 'Organizations' },
]


const REGIONS = [
  { value: 'global', label: 'Global' },
  { value: 'Africa', label: 'Africa' },
  { value: 'West Africa', label: 'West Africa' },
  { value: 'East Africa', label: 'East Africa' },
  { value: 'Southern Africa', label: 'Southern Africa' },
  { value: 'North Africa', label: 'North Africa' },
  { value: 'Europe', label: 'Europe' },
  { value: 'North America', label: 'North America' },
  { value: 'Asia', label: 'Asia' },
]

const COUNTRIES = [
  { value: '', label: 'All countries' },
  { value: 'Nigeria', label: 'Nigeria' },
  { value: 'Lagos', label: 'Lagos' },
  { value: 'Abuja', label: 'Abuja' },
  { value: 'Ghana', label: 'Ghana' },
  { value: 'Kenya', label: 'Kenya' },
  { value: 'South Africa', label: 'South Africa' },
]

const SORTS = [
  { value: 'rank', label: 'Rank' },
  { value: 'points', label: 'Points' },
  { value: 'win_rate', label: 'Win rate' },
  { value: 'wins', label: 'Wins' },
  { value: 'name', label: 'Name (A-Z)' },
]

const RankingsView = () => {
  const { gameTitles } = useGames();
  const gameOptions = ['all', ...gameTitles];
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  const [tab, setTab] = useState(searchParams.get('tab') || 'players')
  const [game, setGame] = useState(searchParams.get('game') || 'all')
  const [region, setRegion] = useState(searchParams.get('region') || 'global')
  const [country, setCountry] = useState(searchParams.get('country') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'rank')

  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [following, setFollowing] = useState({})
  const [expandedRow, setExpandedRow] = useState(null) // mobile

  const fetchRankings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (game && game !== 'all') params.set('game', game)
      if (region && region !== 'global') params.set('region', region)
      if (country) params.set('country', country)
      if (search) params.set('search', search)

      const headers = { 'Content-Type': 'application/json' }
      if (session?.user?.sessionToken) {
        headers['Authorization'] = `Bearer ${session.user.sessionToken}`
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ranking/?${params.toString()}`,
        { headers }
      )
      if (!res.ok) throw new Error(`Failed to load rankings (${res.status})`)
      const data = await res.json()
      const payload = data?.data || {}
      setPlayers(payload.players || [])
      setTeams(payload.teams || [])
      setOrganizations(payload.organizations || [])
    } catch (err) {
      setError(err.message || 'Failed to load rankings')
      setPlayers([])
      setTeams([])
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }, [game, region, country, search, session])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  // Sync URL with tab + filters
  useEffect(() => {
    const params = new URLSearchParams()
    if (tab && tab !== 'players') params.set('tab', tab)
    if (game && game !== 'all') params.set('game', game)
    if (region && region !== 'global') params.set('region', region)
    if (country) params.set('country', country)
    if (search) params.set('search', search)
    if (sortBy && sortBy !== 'rank') params.set('sort', sortBy)
    const qs = params.toString()
    router.replace(`/rankings${qs ? `?${qs}` : ''}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, game, region, country, search, sortBy])

  const activeList = useMemo(() => {
    if (tab === 'teams') return teams
    if (tab === 'organizations') return organizations
    return players
  }, [tab, players, teams, organizations])

  // Rankings rows are real users/teams and most have no uploaded picture yet.
  // next/image throws ("Cannot read properties of null") on a null src, which
  // white-screened the whole page - fall back to initials like the rest of the app.
  const RankAvatar = ({ src, name, size, className }) => {
    if (src) {
      return (
        <Image src={src} alt={name || ''} width={size} height={size} className={className} unoptimized />
      )
    }
    const initials = (name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
    return (
      <div className={`${className} ${styles.avatarFallback}`} aria-label={name || ''}>
        {initials}
      </div>
    )
  }

  const sortedList = useMemo(() => {
    const arr = [...activeList]
    switch (sortBy) {
      case 'points':
        arr.sort((a, b) => b.points - a.points)
        break
      case 'win_rate':
        arr.sort((a, b) => b.win_rate - a.win_rate)
        break
      case 'wins':
        arr.sort((a, b) => b.wins - a.wins)
        break
      case 'name':
        arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        break
      case 'rank':
      default:
        arr.sort((a, b) => a.rank - b.rank)
        break
    }
    return arr
  }, [activeList, sortBy])

  const top3 = useMemo(() => {
    // Always podium by rank (top 3 by points), regardless of secondary sort.
    return [...activeList].sort((a, b) => a.rank - b.rank).slice(0, 3)
  }, [activeList])

  const sessionUserEntry = useMemo(() => {
    if (tab !== 'players') return null
    return players.find((p) => p.is_session_user) || null
  }, [tab, players])

  const navigateToProfile = (entry) => {
    if (!entry) return
    if (tab === 'players') {
      router.push(`/u/${encodeURIComponent(entry.id)}`)
    } else if (tab === 'teams') {
      router.push(`/teams/${encodeURIComponent(entry.id)}`)
    } else if (tab === 'organizations') {
      router.push(`/organizations/${encodeURIComponent(entry.id)}`)
    }
  }

  const toggleFollow = (e, entry) => {
    e.stopPropagation()
    setFollowing((s) => ({ ...s, [entry.id]: !s[entry.id] }))
  }

  const renderTrend = (entry) => {
    const delta = (entry.prev_rank || entry.rank) - entry.rank // +ve = moved up
    if (delta === 0) {
      return (
        <span className={`${styles.trend} ${styles.trendFlat}`}>
          <LuMinus />
          <span>0</span>
        </span>
      )
    }
    if (delta > 0) {
      return (
        <span className={`${styles.trend} ${styles.trendUp}`}>
          <LuTrendingUp />
          <span>+{delta}</span>
        </span>
      )
    }
    return (
      <span className={`${styles.trend} ${styles.trendDown}`}>
        <LuTrendingDown />
        <span>{delta}</span>
      </span>
    )
  }

  const podiumIcons = [
    <LuCrown key="1" className={styles.podiumIcon} />,
    <LuMedal key="2" className={styles.podiumIcon} />,
    <LuMedal key="3" className={styles.podiumIcon} />,
  ]
  const podiumLabels = ['1st', '2nd', '3rd']
  const podiumOrderClass = [styles.podiumGold, styles.podiumSilver, styles.podiumBronze]

  const positionsToTop100 = sessionUserEntry
    ? Math.max(0, sessionUserEntry.rank - 100) === 0
      ? sessionUserEntry.rank <= 100
        ? null
        : sessionUserEntry.rank - 100
      : sessionUserEntry.rank - 100
    : null

  return (
    <div className={styles.rankingsContainer}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.pageTitle}>Rankings</h3>
          <p className={styles.pageSub}>Top players, teams and organizations across V-ENT.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsRow}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.tabBTN} ${tab === t.id ? styles.activeTab : ''}`}
            onClick={() => { setTab(t.id); setExpandedRow(null) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className={styles.filtersRow}>
        <div className={styles.searchBar}>
          <CiSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder={`Search ${tab}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterSelect}>
          <select value={game} onChange={(e) => setGame(e.target.value)} className={styles.select}>
            {gameOptions.map((g) => (
              <option key={g} value={g}>
                {g === 'all' ? 'All games' : g}
              </option>
            ))}
          </select>
          <TiArrowSortedDown className={styles.selectCaret} />
        </div>

        <div className={styles.filterSelect}>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className={styles.select}>
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <TiArrowSortedDown className={styles.selectCaret} />
        </div>

        <div className={styles.filterSelect}>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={styles.select}>
            {COUNTRIES.map((c) => (
              <option key={c.value || 'all'} value={c.value}>{c.label}</option>
            ))}
          </select>
          <TiArrowSortedDown className={styles.selectCaret} />
        </div>

        <div className={styles.filterSelect}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.select}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>Sort: {s.label}</option>
            ))}
          </select>
          <TiArrowSortedDown className={styles.selectCaret} />
        </div>
      </div>

      {/* Podium */}
      {!loading && top3.length === 3 && (
        <div className={styles.podiumWrap}>
          {[1, 0, 2].map((slot) => {
            // Rendering order: 2nd, 1st, 3rd for visual hierarchy on desktop.
            const entry = top3[slot]
            if (!entry) return null
            return (
              <button
                type="button"
                key={entry.id}
                className={`${styles.podiumCard} ${podiumOrderClass[slot]}`}
                onClick={() => navigateToProfile(entry)}
                aria-label={`View ${entry.name}`}
              >
                <span className={styles.podiumRank}>
                  {podiumIcons[slot]}
                  <span>{podiumLabels[slot]}</span>
                </span>
                <div className={styles.podiumAvatarWrap}>
                  <RankAvatar
                    src={entry.avatar}
                    name={entry.name}
                    size={88}
                    className={styles.podiumAvatar}
                  />
                </div>
                <p className={styles.podiumName}>{entry.name}</p>
                <p className={styles.podiumMeta}>
                  <LuMapPin className={styles.podiumMetaIcon} />
                  {entry.country}
                </p>
                <div className={styles.podiumStats}>
                  <div className={styles.podiumStat}>
                    <span className={styles.podiumStatValue}>{entry.points.toLocaleString()}</span>
                    <span className={styles.podiumStatLabel}>Points</span>
                  </div>
                  <div className={styles.podiumStatDivider} />
                  <div className={styles.podiumStat}>
                    <span className={styles.podiumStatValue}>{entry.win_rate}%</span>
                    <span className={styles.podiumStatLabel}>Win rate</span>
                  </div>
                </div>
                <div className={styles.podiumTrend}>{renderTrend(entry)}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* Table */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeaderRow}>
          <div className={`${styles.col} ${styles.colRank}`}>Rank</div>
          <div className={`${styles.col} ${styles.colName}`}>{tab === 'players' ? 'Player' : tab === 'teams' ? 'Team' : 'Organization'}</div>
          <div className={`${styles.col} ${styles.colRegion}`}>Region</div>
          <div className={`${styles.col} ${styles.colPoints}`}>Points</div>
          <div className={`${styles.col} ${styles.colWl}`}>W-L</div>
          <div className={`${styles.col} ${styles.colWinRate}`}>Win rate</div>
          <div className={`${styles.col} ${styles.colTrend}`}>Trend</div>
          <div className={`${styles.col} ${styles.colActions}`}>Actions</div>
        </div>

        {loading && (
          <div className={styles.skeletonList}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={styles.skeletonBlock} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <p className={styles.errorText}>{error}</p>
        )}

        {!loading && !error && sortedList.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No results</p>
            <p className={styles.emptySub}>Try adjusting your filters or search term.</p>
          </div>
        )}

        {!loading && !error && sortedList.length > 0 && (
          <div className={styles.tableBody}>
            {sortedList.map((entry) => {
              const isMe = entry.is_session_user
              const isExpanded = expandedRow === entry.id
              return (
                <div
                  key={entry.id}
                  className={`${styles.row} ${isMe ? styles.rowMe : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateToProfile(entry)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigateToProfile(entry) }}
                >
                  <div className={`${styles.col} ${styles.colRank}`}>
                    <span className={`${styles.rankPill} ${entry.rank <= 3 ? styles.rankPillTop : ''}`}>
                      #{entry.rank}
                    </span>
                  </div>
                  <div className={`${styles.col} ${styles.colName}`}>
                    <div className={styles.nameCell}>
                      <div className={styles.avatarWrap}>
                        <RankAvatar
                          src={entry.avatar}
                          name={entry.name}
                          size={36}
                          className={styles.avatar}
                        />
                      </div>
                      <div className={styles.nameInfo}>
                        <span className={styles.nameText}>{entry.name}</span>
                        <span className={styles.gameText}>{entry.favorite_game}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`${styles.col} ${styles.colRegion}`}>
                    <span className={styles.regionText}>
                      <LuMapPin className={styles.regionIcon} />
                      {entry.country}
                    </span>
                    <span className={styles.regionSub}>{entry.region}</span>
                  </div>
                  <div className={`${styles.col} ${styles.colPoints}`}>
                    <span className={styles.pointsValue}>{entry.points.toLocaleString()}</span>
                  </div>
                  <div className={`${styles.col} ${styles.colWl}`}>
                    <span className={styles.wlValue}>
                      <span className={styles.wins}>{entry.wins}</span>
                      <span className={styles.wlSep}>-</span>
                      <span className={styles.losses}>{entry.losses}</span>
                    </span>
                  </div>
                  <div className={`${styles.col} ${styles.colWinRate}`}>
                    <div className={styles.winRateWrap}>
                      <span className={styles.winRateValue}>{entry.win_rate}%</span>
                      <div className={styles.winRateBar}>
                        <div
                          className={styles.winRateFill}
                          style={{ width: `${Math.min(100, entry.win_rate)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className={`${styles.col} ${styles.colTrend}`}>{renderTrend(entry)}</div>
                  <div className={`${styles.col} ${styles.colActions}`}>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionGhost}`}
                      onClick={(e) => { e.stopPropagation(); navigateToProfile(entry) }}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${following[entry.id] ? styles.actionFollowing : styles.actionFollow}`}
                      onClick={(e) => toggleFollow(e, entry)}
                    >
                      {following[entry.id] ? 'Following' : 'Follow'}
                    </button>
                  </div>

                  {/* Mobile expand toggle */}
                  <button
                    type="button"
                    className={styles.mobileExpandBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedRow(isExpanded ? null : entry.id)
                    }}
                    aria-label="Toggle details"
                  >
                    {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                  </button>

                  {/* Mobile detail strip (revealed by expand) */}
                  <div className={`${styles.mobileDetail} ${isExpanded ? styles.mobileDetailOpen : ''}`}>
                    <div className={styles.mobileDetailGrid}>
                      <div className={styles.mobileDetailItem}>
                        <span className={styles.mobileDetailLabel}>Region</span>
                        <span className={styles.mobileDetailValue}>{entry.country} · {entry.region}</span>
                      </div>
                      <div className={styles.mobileDetailItem}>
                        <span className={styles.mobileDetailLabel}>Points</span>
                        <span className={styles.mobileDetailValue}>{entry.points.toLocaleString()}</span>
                      </div>
                      <div className={styles.mobileDetailItem}>
                        <span className={styles.mobileDetailLabel}>W-L</span>
                        <span className={styles.mobileDetailValue}>{entry.wins} - {entry.losses}</span>
                      </div>
                      <div className={styles.mobileDetailItem}>
                        <span className={styles.mobileDetailLabel}>Win rate</span>
                        <span className={styles.mobileDetailValue}>{entry.win_rate}%</span>
                      </div>
                      <div className={styles.mobileDetailItem}>
                        <span className={styles.mobileDetailLabel}>Trend</span>
                        <span className={styles.mobileDetailValue}>{renderTrend(entry)}</span>
                      </div>
                    </div>
                    <div className={styles.mobileDetailActions}>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionGhost}`}
                        onClick={(e) => { e.stopPropagation(); navigateToProfile(entry) }}
                      >
                        View profile
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${following[entry.id] ? styles.actionFollowing : styles.actionFollow}`}
                        onClick={(e) => toggleFollow(e, entry)}
                      >
                        {following[entry.id] ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sticky "Your rank" strip - players tab only */}
      {tab === 'players' && sessionUserEntry && (
        <div className={styles.yourRankStrip}>
          <div className={styles.yourRankInner}>
            <div className={styles.yourRankLeft}>
              <div className={styles.yourRankAvatarWrap}>
                <RankAvatar
                  src={sessionUserEntry.avatar}
                  name={sessionUserEntry.name}
                  size={42}
                  className={styles.yourRankAvatar}
                />
              </div>
              <div className={styles.yourRankInfo}>
                <span className={styles.yourRankLabel}>Your rank</span>
                <span className={styles.yourRankName}>{sessionUserEntry.name}</span>
              </div>
            </div>
            <div className={styles.yourRankCenter}>
              <div className={styles.yourRankStat}>
                <span className={styles.yourRankStatValue}>#{sessionUserEntry.rank}</span>
                <span className={styles.yourRankStatLabel}>Rank</span>
              </div>
              <GoDotFill className={styles.yourRankDot} />
              <div className={styles.yourRankStat}>
                <span className={styles.yourRankStatValue}>{sessionUserEntry.points.toLocaleString()}</span>
                <span className={styles.yourRankStatLabel}>Points</span>
              </div>
              <GoDotFill className={styles.yourRankDot} />
              <div className={styles.yourRankStat}>
                <span className={styles.yourRankStatValue}>{sessionUserEntry.win_rate}%</span>
                <span className={styles.yourRankStatLabel}>Win rate</span>
              </div>
              <GoDotFill className={`${styles.yourRankDot} ${styles.yourRankDotHide}`} />
              <div className={`${styles.yourRankStat} ${styles.yourRankTrendStat}`}>
                {renderTrend(sessionUserEntry)}
                <span className={styles.yourRankStatLabel}>Trend</span>
              </div>
            </div>
            <div className={styles.yourRankRight}>
              {sessionUserEntry.rank <= 100 ? (
                <span className={styles.yourRankBadge}>
                  <HiOutlineTrophy /> Top 100
                </span>
              ) : (
                <span className={styles.yourRankGap}>
                  {sessionUserEntry.rank - 100} positions to Top 100
                </span>
              )}
              <Link href="/user-profile" className={`${styles.actionBtn} ${styles.actionPrimary}`}>
                View profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RankingsView
