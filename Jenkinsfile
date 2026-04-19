pipeline {
    agent any

    environment {
        APP_NAME    = 'react-vite-cicd-app'
        PROJECT_DIR = '/Users/hp/Downloads/Jenkins'   // ⚠️ CHANGE if needed
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '5'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }

    parameters {
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Skip test stage')
        booleanParam(name: 'SKIP_LINT', defaultValue: false, description: 'Skip lint stage')
    }

    stages {

        // ✅ CHECKOUT
        stage('Checkout') {
            steps {
                echo "Copying project files..."

                sh '''
                echo "Copying files from $PROJECT_DIR"

                cp $PROJECT_DIR/package.json .
                cp $PROJECT_DIR/package-lock.json .
                cp $PROJECT_DIR/vite.config.js .
                cp $PROJECT_DIR/index.html .
                cp $PROJECT_DIR/.eslintrc.cjs .

                if [ -d "$PROJECT_DIR/src" ]; then
                    cp -r $PROJECT_DIR/src ./src
                fi

                echo "Workspace contents:"
                ls -la
                '''
            }
        }

        // ✅ BUILD
        stage('Build') {
            steps {
                echo "Building app..."

                sh '''
                node --version
                npm --version

                npm install
                npm run build

                echo "Dist folder:"
                ls -la dist || echo "No dist folder"
                '''

                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }

        // ✅ TEST
        stage('Test') {
            when {
                not { expression { params.SKIP_TESTS } }
            }
            steps {
                sh '''
                echo "Running tests..."
                npx vitest run --coverage
                '''
            }
        }

        // ✅ CODE QUALITY
        stage('Code Quality') {
            when {
                not { expression { params.SKIP_LINT } }
            }
            steps {
                sh '''
                echo "Running ESLint..."
                npx eslint . --ext js,jsx || echo "Lint warnings ignored"
                '''
            }
        }

        // ✅ SECURITY
        stage('Security') {
            steps {
                sh '''
                echo "Running npm audit..."
                npm audit --audit-level=high || echo "Vulnerabilities found"
                '''
            }
        }

        // ✅ DEPLOY CHECK
        stage('Deploy Check') {
            steps {
                sh '''
                if [ -f dist/index.html ]; then
                    echo "✅ Build OK"
                else
                    echo "❌ Build FAILED"
                    exit 1
                fi
                '''
            }
        }

        // ✅ RELEASE
        stage('Release') {
            steps {
                echo "Release version: v1.0.${BUILD_NUMBER}"
            }
        }

        // ✅ SUMMARY
        stage('Summary') {
            steps {
                sh '''
                echo "================================="
                echo "Pipeline Summary"
                echo "App: $APP_NAME"
                echo "Build: $BUILD_NUMBER"
                echo "================================="
                '''
            }
        }
    }

    post {
        always {
            echo "Result: ${currentBuild.currentResult}"
        }

        success {
            echo "✅ PIPELINE SUCCESS"
        }

        failure {
            echo "❌ PIPELINE FAILED"
        }
    }
}
