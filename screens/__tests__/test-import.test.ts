import { vi, describe, it, expect } from 'vitest'
vi.mock('../../hooks/useLocation', () => ({ useLocation: vi.fn() }))
vi.mock('../../hooks/useFavoriteLocations', () => ({ useFavoriteLocations: vi.fn() }))
vi.mock('../../components/favorites/FavoritesList', () => ({ FavoritesList: vi.fn(() => null) }))
vi.mock('../../components/favorites/AddFavoriteModal', () => ({ AddFavoriteModal: vi.fn(() => null) }))
vi.mock('@react-navigation/native', () => ({ useNavigation: vi.fn(), useFocusEffect: vi.fn() }))
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }))
vi.mock('../../lib/haptics', () => ({ selectionFeedback: vi.fn() }))
import { FavoritesScreen } from '../../screens/FavoritesScreen'

describe('test', () => {
  it('works', () => {
    expect(FavoritesScreen).toBeDefined()
  })
})
