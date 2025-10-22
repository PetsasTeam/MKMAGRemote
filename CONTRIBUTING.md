# Contributing to IPTV MK Remote

Thank you for your interest in contributing to IPTV MK Remote! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with:

1. **Clear title** describing the issue
2. **Detailed description** of the problem
3. **Steps to reproduce** the issue
4. **Expected behavior** vs actual behavior
5. **Screenshots** if applicable
6. **Environment details**:
   - Device model and OS version
   - App version
   - MAG device model

### Suggesting Features

We love new ideas! To suggest a feature:

1. Check if the feature has already been suggested
2. Create a new issue with the `enhancement` label
3. Describe the feature and its benefits
4. Provide use cases and examples

### Pull Requests

We actively welcome your pull requests:

1. **Fork the repository** and create your branch from `main`
2. **Make your changes**:
   - Write clear, readable code
   - Follow the existing code style
   - Add comments where necessary
   - Update documentation if needed
3. **Test your changes**:
   - Ensure the app builds successfully
   - Test on both Android and iOS if possible
   - Verify with actual MAG devices
4. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Reference issue numbers when applicable
5. **Submit the pull request**:
   - Provide a clear description of the changes
   - Link to related issues
   - Include screenshots/videos for UI changes

## Development Guidelines

### Code Style

- Use **TypeScript** for all new code
- Follow **React/React Native best practices**
- Use **functional components** and **hooks**
- Maintain **consistent formatting** (we use Prettier)
- Write **meaningful variable and function names**

### Component Structure

```typescript
// Good component structure
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
}

const MyComponent: React.FC<Props> = ({ title, onPress }) => {
  return (
    <View style={styles.container}>
      {/* Component content */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // styles
  },
});

export default MyComponent;
```

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(remote): add support for MAG 500 series
fix(discovery): resolve network scanning timeout issue
docs(readme): update installation instructions
```

### Testing

- Test on **both Android and iOS** when possible
- Verify compatibility with **multiple MAG device models**
- Test **network discovery** on different network configurations
- Check **error handling** and edge cases
- Ensure **no performance regressions**

### Documentation

- Update **README.md** for user-facing changes
- Update **SETUP.md** for development setup changes
- Add **inline comments** for complex logic
- Update **type definitions** when modifying interfaces

## Project Structure

```
MKMAGRemote/
├── src/
│   ├── components/       # Reusable UI components
│   ├── context/          # React Context providers
│   ├── screens/          # App screens
│   ├── services/         # Business logic and API calls
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── android/              # Android-specific code
├── ios/                  # iOS-specific code
├── App.tsx               # Main app component
└── index.js              # Entry point
```

## Adding New Features

### Adding a New Screen

1. Create screen component in `src/screens/`
2. Add route type to `RootStackParamList` in `App.tsx`
3. Add screen to navigation stack in `App.tsx`
4. Update navigation logic in relevant screens

### Adding MAG Commands

1. Add command code to `MAGCommand` enum in `src/types/index.ts`
2. Update `MAGService` if needed
3. Add UI button in `RemoteScreen.tsx`

### Adding Device Models

1. Update device detection in `DeviceDiscoveryService`
2. Add model-specific logic if needed
3. Update documentation with supported models

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- No harassment or discrimination

### Getting Help

- Check existing documentation first
- Search closed issues for similar problems
- Ask questions in GitHub Discussions
- Be patient and respectful when asking for help

## License

By contributing to IPTV MK Remote, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Special thanks section for major features

Thank you for contributing to IPTV MK Remote!
