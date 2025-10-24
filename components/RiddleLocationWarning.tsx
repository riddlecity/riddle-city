import { OpeningHours } from '../lib/googlePlaces';
// TODO: Update this component to use new database-based system
// import { generateLocationWarning, getUKTime } from '../lib/timeWarnings';

interface RiddleLocationWarningProps {
  locationName: string;
  openingHours: OpeningHours;
  className?: string;
}

export default function RiddleLocationWarning(_props: RiddleLocationWarningProps) {
  // TODO: This component is disabled until updated to use new database system
  return null;
}
