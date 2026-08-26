import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect } from 'react';
import { HiPlus } from "react-icons/hi";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import editUserProfileDetailsStyles from './../edit-team-profile-info/edit-team-profile-details/edit-team-profile-details.module.css';
import styles from './edit-team-profile-links.module.css';
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar';
import { VENT } from '@/app/api/auth/[...nextauth]/route';
import CircularProgress from '@mui/material/CircularProgress';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const EditTeamProfileLinks = () => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session,
    status
  } = useSession();
  const [links, setLinks] = useState([{
    title: '',
    link: ''
  }]);
  const [sessionToken, setSessionToken] = useState('');
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [loading, setLoading] = useState(false);
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const router = useRouter();

  // Fetch sessionToken and set it when authenticated
  useEffect(() => {
    if (status === "authenticated" && session?.user?.sessionToken) {
      setSessionToken(session.user.sessionToken);
    }
  }, [session, status]);
  const handleAddLink = () => {
    setLinks([...links, {
      title: '',
      link: ''
    }]);
  };
  const handleLinkChange = (index, field, value) => {
    const updatedLinks = [...links];
    updatedLinks[index][field] = value;
    setLinks(updatedLinks);
  };
  const handleCloseSnackbar = () => {
    setOpen(false);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!sessionToken) {
        setSnackbarMessage(tt("msg.sessionTokenIsMissingPlease", "Session token is missing. Please log in again."));
        setSnackbarType('error');
        setOpen(true);
        return;
      }
      const formattedLinks = {
        facebook,
        twitter,
        instagram,
        youtube,
        ...links.reduce((acc, link) => {
          if (link.title && link.link) {
            acc[link.title] = link.link;
          }
          return acc;
        }, {})
      };
      const response = await fetch(VENT.EDIT_LINKS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          links: formattedLinks
        })
      });
      const data = await response.json();
      if (response.ok) {
        setLinks([{
          title: '',
          link: ''
        }]);
        router.push('/user-profile');
        setSnackbarMessage(apiMessage(tt, data, "api.linksUpdatedSuccessfully", "Links updated successfully!"));
        setSnackbarType('success');
      } else {
        setSnackbarMessage(apiMessage(tt, data, "api.failedToUpdateLinks", "Failed to update links."));
        setSnackbarType('error');
      }
      setOpen(true);
    } catch (error) {
      console.error('Error updating links:', error);
      setSnackbarMessage(tt("msg.anErrorOccurredWhileUpdating", "An error occurred while updating your links."));
      setSnackbarType('error');
      setOpen(true);
    }
    setLoading(false);
  };
  return <div className={styles.editLinksContainer}>
      <h3>{tt("ui.web.social.links.d9e8", "Web and Social Links")}</h3>

      <form onSubmit={handleSubmit}>
        <div className={editUserProfileDetailsStyles.profileDetailsContainer}>
          <div className={editUserProfileDetailsStyles.inputGroup}>
            <label htmlFor="facebook">{tt("ui.facebook.82da", "Facebook")}</label>
            <input id="facebook" type="text" placeholder={tt("ui.https.www.facebook.com.686e", "https://www.facebook.com")} value={facebook} onChange={e => setFacebook(e.target.value)} />
          </div>

          <div className={editUserProfileDetailsStyles.inputGroup}>
            <label htmlFor="twitter">{tt("ui.x.twitter.9ae4", "X (Twitter)")}</label>
            <input id="twitter" type="text" placeholder={tt("ui.https.www.x.com.91e2", "https://www.x.com")} value={twitter} onChange={e => setTwitter(e.target.value)} />
          </div>

          <div className={editUserProfileDetailsStyles.inputGroup}>
            <label htmlFor="instagram">{tt("ui.instagram.5721", "Instagram")}</label>
            <input id="instagram" type="text" placeholder={tt("ui.https.www.instagram.com.dd26", "https://www.instagram.com")} value={instagram} onChange={e => setInstagram(e.target.value)} />
          </div>

          <div className={editUserProfileDetailsStyles.inputGroup}>
            <label htmlFor="youtube">{tt("ui.youtube.5588", "YouTube")}</label>
            <input id="youtube" type="text" placeholder={tt("ui.https.www.youtube.com.1e06", "https://www.youtube.com")} value={youtube} onChange={e => setYoutube(e.target.value)} />
          </div>

          {links.map((link, index) => <div className={styles.titleLinkContainer} key={index}>
              <div className={`${editUserProfileDetailsStyles.inputGroup} ${styles.addInputGroup}`}>
                <label htmlFor={`title-${index}`}>{tt("ui.title.768e", "Title")}</label>
                <input id={`title-${index}`} type="text" placeholder={tt("ui.e.g.youtube.instagram.8e75", "e.g. YouTube, Instagram")} value={tx(link.title)} onChange={e => handleLinkChange(index, 'title', e.target.value)} />
              </div>

              <div className={`${editUserProfileDetailsStyles.inputGroup} ${styles.addInputGroup}`}>
                <label htmlFor={`link-${index}`}>{tt("ui.link.d051", "Link")}</label>
                <input id={`link-${index}`} type="text" placeholder={tt("ui.https.www.youtube.com.1e06", "https://www.youtube.com")} value={link.link} onChange={e => handleLinkChange(index, 'link', e.target.value)} />
              </div>
            </div>)}

          <button className={styles.addAnotherLink} type="button" onClick={handleAddLink}>
            <HiPlus className={styles.addLinkIcon} /> {tt("ui.add.another.link.da5e", "Add another link")}
          </button>
        </div>

        <div className={styles.buttonContainer}>
          <button className={`btn redBTN ${styles.resendBTN}`} type="submit" disabled={loading}>
            {loading ? <CircularProgress size={24} sx={{
            color: 'white'
          }} /> : tx("Save Changes")}
          </button>
        </div>
      </form>

      <MessageSnackbar open={open} onClose={handleCloseSnackbar} message={snackbarMessage} type={snackbarType} />
    </div>;
};
export default EditTeamProfileLinks;