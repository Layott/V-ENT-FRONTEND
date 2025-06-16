import { useState, useEffect } from 'react';
import { HiPlus } from "react-icons/hi";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import editUserProfileDetailsStyles from './../edit-user-profile-info/edit-user-profile-details/edit-user-profile-details.module.css';
import styles from './edit-user-profile-links.module.css';
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar';
import { VENT } from '@/app/api/auth/[...nextauth]/route';
import CircularProgress from '@mui/material/CircularProgress';

const EditUserProfileLinks = () => {
  const { data: session, status } = useSession();
  const [links, setLinks] = useState([{ title: '', link: '' }]);
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
    setLinks([...links, { title: '', link: '' }]);
  };

  const handleLinkChange = (index, field, value) => {
    const updatedLinks = [...links];
    updatedLinks[index][field] = value;
    setLinks(updatedLinks);
  };

  const handleCloseSnackbar = () => {
    setOpen(false);
  };

  // Add this right before the handleSubmit function
console.log('Current state values:', {
  facebook,
  twitter, 
  instagram,
  youtube
});

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  console.log('YouTube state value:', youtube);
  console.log('YouTube length:', youtube.length);
  console.log('Is youtube truthy?', !!youtube);
  try {
    if (!sessionToken) {
      setSnackbarMessage('Session token is missing. Please log in again.');
      setSnackbarType('error');
      setOpen(true);
      return;
    }

    // Format links as dictionary/object as backend expects
    const formattedLinks = {};
    
    // Add predefined social media links if they have values
    if (facebook) formattedLinks.facebook = facebook;
    if (twitter) formattedLinks.twitter = twitter;
    if (instagram) formattedLinks.instagram = instagram;
    if (youtube) formattedLinks.youtube = youtube;
    
    // Add dynamic links
    links.forEach(link => {
      if (link.title && link.link) {
        formattedLinks[link.title] = link.link;
      }
    });

    console.log('Formatted links being sent:', formattedLinks);
    console.log('Full payload:', { social_links: formattedLinks });

    const response = await fetch(VENT.EDIT_LINKS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ links: formattedLinks }),
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);

    if (response.ok) {
      setLinks([{ title: '', link: '' }]);
      router.push('/user-profile');
      setSnackbarMessage(data.message || 'Links updated successfully!');
      setSnackbarType('success');
    } else {
      setSnackbarMessage(data.message || 'Failed to update links.');
      setSnackbarType('error');
    }
    setOpen(true);
  } catch (error) {
    console.error('Error updating links:', error);
    setSnackbarMessage('An error occurred while updating your links.');
    setSnackbarType('error');
    setOpen(true);
  }
  setLoading(false);
};

  return (
    <div className={styles.editLinksContainer}>
      <h3>Web and Social Links</h3>

      <form onSubmit={handleSubmit}>
        <div className={editUserProfileDetailsStyles.profileDetailsContainer}>
          <div className={editUserProfileDetailsStyles.inputGroup}>
            <label htmlFor="facebook">Facebook</label>
            <input id="facebook" type="text" placeholder="https://www.facebook.com" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
          </div>

          <div className={editUserProfileDetailsStyles.inputGroup}>
            <label htmlFor="twitter">X (Twitter)</label>
            <input id="twitter" type="text" placeholder="https://www.x.com" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
          </div>

          <div className={editUserProfileDetailsStyles.inputGroup}>
            <label htmlFor="instagram">Instagram</label>
            <input id="instagram" type="text" placeholder="https://www.instagram.com" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </div>

          <div className={editUserProfileDetailsStyles.inputGroup}>
            <label htmlFor="youtube">YouTube</label>
            <input id="youtube" type="text" placeholder="https://www.youtube.com" value={youtube} onChange={(e) => setYoutube(e.target.value)} />
          </div>

          {links.map((link, index) => (
            <div className={styles.titleLinkContainer} key={index}>
              <div className={`${editUserProfileDetailsStyles.inputGroup} ${styles.addInputGroup}`}>
                <label htmlFor={`title-${index}`}>Title</label>
                <input
                  id={`title-${index}`}
                  type="text"
                  placeholder="e.g. YouTube, Instagram"
                  value={link.title}
                  onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                />
                
              </div>

              <div className={`${editUserProfileDetailsStyles.inputGroup} ${styles.addInputGroup}`}>
                <label htmlFor={`link-${index}`}>Link</label>
                <input
                  id={`link-${index}`}
                  type="text"
                  placeholder="https://www.youtube.com"
                  value={link.link}
                  onChange={(e) => handleLinkChange(index, 'link', e.target.value)}
                />
              </div>
            </div>
          ))}

          <button className={styles.addAnotherLink} type="button" onClick={handleAddLink}>
            <HiPlus className={styles.addLinkIcon} /> Add another link
          </button>
        </div>

        <div className={styles.buttonContainer}>
          <button className={`btn redBTN ${styles.resendBTN}`} type="submit" disabled={loading}>
            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Save Changes'}
          </button>
        </div>
      </form>

      <MessageSnackbar
        open={open}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        type={snackbarType}
      />
    </div>
  );
};

export default EditUserProfileLinks;
