pipeline {
    agent any

    environment {
        APP_NAME = 'react-vite-cicd-app'
        PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
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

        // ✅ CHECK NODE
        stage('Check Node') {
            steps {
                sh '''
                echo "PATH: $PATH"
                which node
                node -v
                npm -v
                '''
            }
        }

        // ✅ BUILD
        stage('Build') {
            steps {
                echo "Building app..."

                sh '''
                echo "Installing dependencies..."
                npm install

                echo "Running build..."
                npm run build

                echo "Checking dist folder..."
                if [ -d "dist" ]; then
                    ls -la dist
                else
                    echo "❌ dist folder not found"
                    exit 1
                fi
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

   
     stage('Deploy') {
    steps {
        sh '''
        echo "Starting deployment..."

        npm install -g serve

        # Kill old process
        pkill -f "serve -s dist" || true

        # Start server (bind to all interfaces)
        nohup serve -s dist -l tcp://0.0.0.0:3000 > serve.log 2>&1 &

        sleep 5

        echo "Checking server..."
        lsof -i :3000 || echo "Server not running"

        echo "Logs:"
        tail -n 10 serve.log || true
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
                echo "Deployment: http://localhost:3000"
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
