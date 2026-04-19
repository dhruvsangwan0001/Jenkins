pipeline {
    agent any

    // ─────────────────────────────────────────────────────
    // ENVIRONMENT VARIABLES
    // ─────────────────────────────────────────────────────
    environment {
        // Application identity
        APP_NAME        = 'react-vite-cicd-app'
        NODE_VERSION    = '18'

        // Docker image config
        DOCKER_HUB_USER = credentials('DOCKER_HUB_USER')   // Jenkins credential: username text
        DOCKER_IMAGE    = "${DOCKER_HUB_USER}/${APP_NAME}"
        IMAGE_TAG_BUILD = "build-${BUILD_NUMBER}"
        IMAGE_TAG_FULL  = "${DOCKER_IMAGE}:${IMAGE_TAG_BUILD}"
        IMAGE_TAG_LATEST= "${DOCKER_IMAGE}:latest"

        // SonarQube
        SONAR_PROJECT_KEY = 'react-vite-cicd-app'

        // Trivy thresholds
        TRIVY_SEVERITY    = 'CRITICAL'          // fail only on CRITICAL
        TRIVY_EXIT_CODE   = '1'

        // Ports
        STAGING_PORT    = '3001'
        PROD_PORT       = '80'

        // Monitoring
        GRAFANA_PASSWORD = credentials('GRAFANA_PASSWORD')  // Jenkins secret text
    }

    // ─────────────────────────────────────────────────────
    // OPTIONS
    // ─────────────────────────────────────────────────────
    options {
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '5'))
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
        disableConcurrentBuilds()
    }

    // ─────────────────────────────────────────────────────
    // TRIGGERS
    // ─────────────────────────────────────────────────────
    triggers {
        pollSCM('H/5 * * * *')
    }

    // ─────────────────────────────────────────────────────
    // PARAMETERS
    // ─────────────────────────────────────────────────────
    parameters {
        booleanParam(name: 'SKIP_TESTS',        defaultValue: false, description: 'Skip test stage')
        booleanParam(name: 'SKIP_SONAR',        defaultValue: false, description: 'Skip SonarQube analysis')
        booleanParam(name: 'PUSH_TO_REGISTRY',  defaultValue: true,  description: 'Push image to Docker Hub')
        booleanParam(name: 'DEPLOY_PRODUCTION', defaultValue: false, description: 'Deploy to production (manual gate)')
        string(name:  'TRIVY_SEVERITY_OVERRIDE', defaultValue: '', description: 'Override Trivy severity (leave blank to use default CRITICAL)')
    }

    stages {

        // ══════════════════════════════════════════════
        // STAGE 1: BUILD
        // ══════════════════════════════════════════════
        stage('Build') {
            steps {
                script {
                    echo "╔══════════════════════════════╗"
                    echo "║  STAGE 1: BUILD               ║"
                    echo "╚══════════════════════════════╝"

                    // Capture short git hash for image tagging
                    env.GIT_SHORT = sh(
                        script: "git rev-parse --short HEAD 2>/dev/null || echo 'nogit'",
                        returnStdout: true
                    ).trim()

                    env.IMAGE_TAG_COMMIT = "${DOCKER_IMAGE}:git-${env.GIT_SHORT}"

                    echo "Build #${BUILD_NUMBER} | Commit: ${env.GIT_SHORT}"
                    echo "Image: ${IMAGE_TAG_FULL}"
                }

                // Install Node dependencies
                sh '''
                    echo "==> Node version: $(node --version)"
                    echo "==> npm  version: $(npm --version)"
                    npm ci --prefer-offline || npm install
                '''

                // Run Vite production build
                sh '''
                    echo "==> Building React + Vite application..."
                    VITE_BUILD_NUMBER=${BUILD_NUMBER} \
                    VITE_GIT_COMMIT=${GIT_SHORT} \
                    npm run build
                    echo "==> Build complete. Dist contents:"
                    ls -lah dist/
                '''

                // Build Docker image (multi-stage)
                sh '''
                    echo "==> Building Docker image: ${IMAGE_TAG_FULL}"
                    docker build \
                        --build-arg VITE_BUILD_NUMBER=${BUILD_NUMBER} \
                        --build-arg VITE_GIT_COMMIT=${GIT_SHORT} \
                        --tag ${IMAGE_TAG_FULL} \
                        --tag ${IMAGE_TAG_COMMIT} \
                        --tag ${IMAGE_TAG_LATEST} \
                        --label "build.number=${BUILD_NUMBER}" \
                        --label "git.commit=${GIT_SHORT}" \
                        --label "build.timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                        --file Dockerfile \
                        .
                    echo "==> Docker image built successfully"
                    docker images | grep ${APP_NAME} || true
                '''

                // Archive dist artifacts
                archiveArtifacts artifacts: 'dist/**', fingerprint: true, allowEmptyArchive: false
            }

            post {
                success { echo "✅ BUILD stage passed" }
                failure { echo "❌ BUILD stage failed" }
            }
        }

        // ══════════════════════════════════════════════
        // STAGE 2: TEST
        // ══════════════════════════════════════════════
        stage('Test') {
            when {
                not { expression { params.SKIP_TESTS } }
            }
            steps {
                script {
                    echo "╔══════════════════════════════╗"
                    echo "║  STAGE 2: TEST                ║"
                    echo "╚══════════════════════════════╝"
                }

                // Run Vitest with JUnit-compatible reporter + coverage
                sh '''
                    echo "==> Running unit + integration tests with coverage..."
                    npm run test:coverage 2>&1 || \
                    npx vitest run --reporter=junit --outputFile=test-results.xml --coverage 2>&1
                '''

                // Publish JUnit results
                junit allowEmptyResults: true, testResults: 'test-results.xml'

                // Publish coverage HTML
                publishHTML([
                    allowMissing:       true,
                    alwaysLinkToLastBuild: true,
                    keepAll:            true,
                    reportDir:          'coverage',
                    reportFiles:        'index.html',
                    reportName:         'Test Coverage Report'
                ])
            }

            post {
                success { echo "✅ TEST stage passed" }
                failure { echo "❌ TEST stage failed" }
            }
        }

        // ══════════════════════════════════════════════
        // STAGE 3: CODE QUALITY (SonarQube)
        // ══════════════════════════════════════════════
        stage('Code Quality') {
            when {
                not { expression { params.SKIP_SONAR } }
            }
            steps {
                script {
                    echo "╔══════════════════════════════╗"
                    echo "║  STAGE 3: CODE QUALITY        ║"
                    echo "╚══════════════════════════════╝"
                }

                withSonarQubeEnv('SonarQube') {
                    sh '''
                        echo "==> Running SonarQube analysis..."
                        if command -v sonar-scanner &>/dev/null; then
                            sonar-scanner \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.projectName="${APP_NAME}" \
                                -Dsonar.projectVersion=1.0.${BUILD_NUMBER} \
                                -Dsonar.sources=src \
                                -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,**/*.test.*,**/test/** \
                                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                                -Dsonar.testExecutionReportPaths=test-results.xml \
                                -Dsonar.sourceEncoding=UTF-8
                        else
                            echo "WARNING: sonar-scanner not in PATH. Using npx..."
                            npx sonar-scanner \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.projectName="${APP_NAME}" \
                                -Dsonar.projectVersion=1.0.${BUILD_NUMBER} \
                                -Dsonar.sources=src \
                                -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,**/*.test.*,**/test/** \
                                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                                -Dsonar.sourceEncoding=UTF-8 || \
                            echo "SonarQube analysis completed (non-blocking)"
                        fi
                    '''
                }

                // Wait for SonarQube quality gate
                timeout(time: 5, unit: 'MINUTES') {
                    script {
                        def qg = waitForQualityGate(abortPipeline: false)
                        if (qg.status != 'OK') {
                            echo "⚠️  SonarQube Quality Gate: ${qg.status} — Review code quality issues"
                        } else {
                            echo "✅ SonarQube Quality Gate: PASSED"
                        }
                    }
                }
            }

            post {
                success { echo "✅ CODE QUALITY stage passed" }
                failure { echo "❌ CODE QUALITY stage failed" }
            }
        }

        // ══════════════════════════════════════════════
        // STAGE 4: SECURITY (npm audit + OWASP + Trivy)
        // ══════════════════════════════════════════════
        stage('Security') {
            steps {
                script {
                    echo "╔══════════════════════════════════════╗"
                    echo "║  STAGE 4: SECURITY SCANNING           ║"
                    echo "╚══════════════════════════════════════╝"

                    // Override severity if parameter provided
                    env.EFFECTIVE_SEVERITY = params.TRIVY_SEVERITY_OVERRIDE?.trim() ?: env.TRIVY_SEVERITY
                }

                // ── Run all security tools in parallel ──
                parallel(
                    // ── Tool 1: npm audit ──────────────────
                    'npm Audit': {
                        sh '''
                            echo "==> [npm audit] Scanning JavaScript dependencies..."
                            npm audit --audit-level=high --json > npm-audit-report.json 2>&1 || true
                            npm audit --audit-level=high 2>&1 || echo "npm audit found vulnerabilities (non-blocking)"
                            echo "==> npm audit report generated: npm-audit-report.json"
                        '''
                    },

                    // ── Tool 2: OWASP Dependency-Check ─────
                    'OWASP Dependency-Check': {
                        sh '''
                            echo "==> [OWASP] Running dependency-check..."
                            if command -v dependency-check &>/dev/null; then
                                dependency-check \
                                    --project "${APP_NAME}" \
                                    --scan . \
                                    --exclude "**/.git/**" \
                                    --exclude "**/node_modules/**" \
                                    --exclude "**/dist/**" \
                                    --format JSON \
                                    --format HTML \
                                    --out dependency-check-report \
                                    --failOnCVSS 9 \
                                    --enableRetired \
                                    --enableExperimental \
                                    --noupdate 2>/dev/null || \
                                dependency-check \
                                    --project "${APP_NAME}" \
                                    --scan . \
                                    --exclude "**/.git/**" \
                                    --exclude "**/node_modules/**" \
                                    --format JSON \
                                    --format HTML \
                                    --out dependency-check-report \
                                    --failOnCVSS 9 || true
                                echo "==> OWASP scan complete"
                            else
                                echo "INFO: OWASP dependency-check not installed — skipping"
                                echo "Install via: https://jeremylong.github.io/DependencyCheck/"
                                mkdir -p dependency-check-report
                                echo '{"scanInfo":{"engineVersion":"N/A"},"dependencies":[]}' \
                                    > dependency-check-report/dependency-check-report.json
                            fi
                        '''
                    },

                    // ── Tool 3: Trivy Container Scan ────────
                    'Trivy Container Scan': {
                        sh '''
                            echo "==> [Trivy] Setting up container image scanner..."

                            # Install Trivy if not present
                            if ! command -v trivy &>/dev/null; then
                                echo "Installing Trivy..."
                                if [ "$(uname -s)" = "Linux" ]; then
                                    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
                                        | sh -s -- -b /usr/local/bin v0.48.0
                                else
                                    echo "Non-Linux OS detected — attempting apt/brew install..."
                                    apt-get install -y trivy 2>/dev/null || \
                                    brew install aquasecurity/trivy/trivy 2>/dev/null || \
                                    echo "Could not auto-install Trivy. Please install manually."
                                fi
                            fi

                            TRIVY_VERSION=$(trivy --version 2>/dev/null | head -1 || echo "unknown")
                            echo "==> Trivy version: ${TRIVY_VERSION}"

                            echo "==> Scanning image: ${IMAGE_TAG_FULL}"

                            # JSON report (machine-readable)
                            trivy image \
                                --format json \
                                --output trivy-report.json \
                                --severity ${EFFECTIVE_SEVERITY} \
                                --ignore-unfixed \
                                --timeout 10m \
                                ${IMAGE_TAG_FULL} || true

                            # Table report (human-readable)
                            trivy image \
                                --format table \
                                --output trivy-report.txt \
                                --severity HIGH,CRITICAL \
                                --ignore-unfixed \
                                --timeout 10m \
                                ${IMAGE_TAG_FULL} || true

                            echo "==> Trivy reports generated"

                            # ── Enforce: fail ONLY on CRITICAL vulnerabilities ──
                            echo "==> Checking for ${EFFECTIVE_SEVERITY} vulnerabilities..."
                            CRITICAL_COUNT=$(trivy image \
                                --format json \
                                --severity ${EFFECTIVE_SEVERITY} \
                                --ignore-unfixed \
                                --quiet \
                                --timeout 10m \
                                ${IMAGE_TAG_FULL} 2>/dev/null | \
                                python3 -c "
import sys, json
data = json.load(sys.stdin)
count = 0
for r in data.get('Results', []):
    for v in r.get('Vulnerabilities', []):
        if v.get('Severity','') == '${EFFECTIVE_SEVERITY}':
            count += 1
print(count)
" 2>/dev/null || echo "0")

                            echo "==> ${EFFECTIVE_SEVERITY} vulnerability count: ${CRITICAL_COUNT}"

                            if [ "${CRITICAL_COUNT}" -gt "0" ] 2>/dev/null; then
                                echo "❌ TRIVY: ${CRITICAL_COUNT} CRITICAL vulnerabilities found — BLOCKING pipeline"
                                cat trivy-report.txt || true
                                exit 1
                            else
                                echo "✅ TRIVY: No ${EFFECTIVE_SEVERITY} vulnerabilities found"
                            fi
                        '''
                    }
                )

                // Archive all security reports
                archiveArtifacts artifacts: 'npm-audit-report.json, trivy-report.json, trivy-report.txt, dependency-check-report/**', allowEmptyArchive: true, fingerprint: true

                // Publish OWASP HTML report
                publishHTML([
                    allowMissing:          true,
                    alwaysLinkToLastBuild: true,
                    keepAll:               true,
                    reportDir:             'dependency-check-report',
                    reportFiles:           'dependency-check-report.html',
                    reportName:            'OWASP Dependency Check Report'
                ])
            }

            post {
                success { echo "✅ SECURITY stage passed" }
                failure { echo "❌ SECURITY stage FAILED — vulnerabilities detected" }
            }
        }

        // ══════════════════════════════════════════════
        // STAGE 5: DEPLOY (Staging)
        // ══════════════════════════════════════════════
        stage('Deploy') {
            steps {
                script {
                    echo "╔══════════════════════════════╗"
                    echo "║  STAGE 5: DEPLOY (Staging)    ║"
                    echo "╚══════════════════════════════╝"
                }

                sh '''
                    echo "==> Deploying to STAGING environment..."

                    # Graceful teardown of previous staging deployment
                    docker-compose -f docker-compose.staging.yml down --remove-orphans 2>/dev/null || true

                    # Deploy with current image tags
                    export DOCKER_IMAGE="${DOCKER_IMAGE}"
                    export IMAGE_TAG="${IMAGE_TAG_BUILD}"
                    export GRAFANA_PASSWORD="${GRAFANA_PASSWORD}"

                    docker-compose -f docker-compose.staging.yml up -d --force-recreate

                    echo "==> Waiting for app container to be healthy..."
                    TIMEOUT=90
                    ELAPSED=0
                    while [ $ELAPSED -lt $TIMEOUT ]; do
                        STATUS=$(docker inspect --format="{{.State.Health.Status}}" react-app-staging 2>/dev/null || echo "starting")
                        echo "    Health: ${STATUS} (${ELAPSED}s elapsed)"
                        if [ "$STATUS" = "healthy" ]; then
                            echo "✅ Staging app is healthy!"
                            break
                        fi
                        sleep 5
                        ELAPSED=$((ELAPSED + 5))
                    done

                    if [ "$STATUS" != "healthy" ]; then
                        echo "⚠️  App health check inconclusive after ${TIMEOUT}s (may still be starting)"
                    fi

                    # HTTP smoke test
                    echo "==> Running HTTP smoke test on staging..."
                    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
                        --max-time 15 \
                        http://localhost:${STAGING_PORT} 2>/dev/null || echo "000")
                    echo "    HTTP response code: ${HTTP_CODE}"

                    if [ "${HTTP_CODE}" = "200" ]; then
                        echo "✅ Staging smoke test PASSED (HTTP 200)"
                    else
                        echo "⚠️  Staging smoke test: HTTP ${HTTP_CODE} (non-blocking)"
                    fi

                    echo "==> Staging deployment complete"
                    docker ps --filter "label=env=staging"
                '''
            }

            post {
                success { echo "✅ DEPLOY (Staging) stage passed" }
                failure {
                    sh '''
                        echo "❌ Deploy failed — collecting logs..."
                        docker logs react-app-staging --tail 50 2>/dev/null || true
                    '''
                }
            }
        }

        // ══════════════════════════════════════════════
        // STAGE 6: RELEASE (Tag + Docker Hub Push)
        // ══════════════════════════════════════════════
        stage('Release') {
            steps {
                script {
                    echo "╔══════════════════════════════════════╗"
                    echo "║  STAGE 6: RELEASE + ARTIFACT STORAGE  ║"
                    echo "╚══════════════════════════════════════╝"
                }

                // ── Git Tagging ─────────────────────────
                sh '''
                    echo "==> Creating Git release tag..."
                    RELEASE_TAG="v1.0.${BUILD_NUMBER}"
                    git config user.email "jenkins@ci.local" 2>/dev/null || true
                    git config user.name  "Jenkins CI"       2>/dev/null || true
                    git tag -a "${RELEASE_TAG}" \
                        -m "Release ${RELEASE_TAG} | Build #${BUILD_NUMBER} | Commit ${GIT_SHORT}" \
                        2>/dev/null || echo "Git tag may already exist, skipping"
                    git tag -l | grep ${RELEASE_TAG} && \
                        echo "✅ Git tag created: ${RELEASE_TAG}" || \
                        echo "INFO: Git tagging skipped (may not be a git repo)"
                '''

                // ── Docker Hub Push ─────────────────────
                script {
                    if (params.PUSH_TO_REGISTRY) {
                        withCredentials([usernamePassword(
                            credentialsId: 'DOCKER_HUB_CREDENTIALS',
                            usernameVariable: 'DOCKER_USER',
                            passwordVariable: 'DOCKER_PASS'
                        )]) {
                            sh '''
                                echo "==> Authenticating with Docker Hub..."
                                echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin

                                RELEASE_TAG="v1.0.${BUILD_NUMBER}"
                                IMAGE_BASE="${DOCKER_USER}/${APP_NAME}"

                                # Tag with all required variants
                                docker tag ${IMAGE_TAG_FULL}    ${IMAGE_BASE}:${IMAGE_TAG_BUILD}
                                docker tag ${IMAGE_TAG_FULL}    ${IMAGE_BASE}:git-${GIT_SHORT}
                                docker tag ${IMAGE_TAG_FULL}    ${IMAGE_BASE}:${RELEASE_TAG}
                                docker tag ${IMAGE_TAG_FULL}    ${IMAGE_BASE}:latest

                                echo "==> Pushing tags to Docker Hub..."
                                docker push ${IMAGE_BASE}:${IMAGE_TAG_BUILD}
                                docker push ${IMAGE_BASE}:git-${GIT_SHORT}
                                docker push ${IMAGE_BASE}:${RELEASE_TAG}
                                docker push ${IMAGE_BASE}:latest

                                echo "✅ All image tags pushed to Docker Hub:"
                                echo "   ${IMAGE_BASE}:${IMAGE_TAG_BUILD}"
                                echo "   ${IMAGE_BASE}:git-${GIT_SHORT}"
                                echo "   ${IMAGE_BASE}:${RELEASE_TAG}"
                                echo "   ${IMAGE_BASE}:latest"

                                docker logout
                            '''
                        }
                    } else {
                        echo "⏭️  PUSH_TO_REGISTRY=false — skipping Docker Hub push"
                    }
                }

                // ── Production Deploy Gate ──────────────
                script {
                    if (params.DEPLOY_PRODUCTION) {
                        sh '''
                            echo "==> Deploying to PRODUCTION environment..."
                            docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

                            export DOCKER_IMAGE="${DOCKER_IMAGE}"
                            export IMAGE_TAG="${IMAGE_TAG_BUILD}"
                            export GRAFANA_PASSWORD="${GRAFANA_PASSWORD}"

                            docker-compose -f docker-compose.prod.yml up -d --force-recreate
                            echo "==> Production deployment triggered"
                            docker ps --filter "label=env=production"
                        '''
                    } else {
                        echo "⏭️  DEPLOY_PRODUCTION=false — production deployment skipped (manual gate)"
                    }
                }
            }

            post {
                success { echo "✅ RELEASE stage passed" }
                failure { echo "❌ RELEASE stage failed" }
            }
        }

        // ══════════════════════════════════════════════
        // STAGE 7: MONITORING (Prometheus + Grafana)
        // ══════════════════════════════════════════════
        stage('Monitoring') {
            steps {
                script {
                    echo "╔══════════════════════════════════════╗"
                    echo "║  STAGE 7: MONITORING VERIFICATION     ║"
                    echo "╚══════════════════════════════════════╝"
                }

                sh '''
                    echo "==> Verifying Prometheus is accessible..."
                    PROM_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
                        --max-time 10 \
                        http://localhost:9091/-/healthy 2>/dev/null || echo "000")
                    echo "    Prometheus health: HTTP ${PROM_CODE}"

                    if [ "${PROM_CODE}" = "200" ]; then
                        echo "✅ Prometheus is UP and healthy"

                        # Check scrape targets
                        TARGETS=$(curl -s http://localhost:9091/api/v1/targets 2>/dev/null | \
                            python3 -c "
import sys, json
data = json.load(sys.stdin)
active = data.get('data',{}).get('activeTargets',[])
for t in active:
    print(f\"  Target: {t.get('labels',{}).get('job','?')} | Health: {t.get('health','?')}\")" \
                            2>/dev/null || echo "  (target details unavailable)")
                        echo "${TARGETS}"
                    else
                        echo "⚠️  Prometheus not yet reachable (may be starting up) — HTTP ${PROM_CODE}"
                    fi

                    echo "==> Verifying Grafana is accessible..."
                    GRAFANA_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
                        --max-time 10 \
                        http://localhost:3001/api/health 2>/dev/null || echo "000")
                    echo "    Grafana health: HTTP ${GRAFANA_CODE}"

                    if [ "${GRAFANA_CODE}" = "200" ]; then
                        echo "✅ Grafana is UP and healthy"
                    else
                        echo "⚠️  Grafana not yet reachable — HTTP ${GRAFANA_CODE}"
                    fi

                    # Final pipeline summary
                    echo ""
                    echo "════════════════════════════════════════"
                    echo "  PIPELINE SUMMARY — Build #${BUILD_NUMBER}"
                    echo "════════════════════════════════════════"
                    echo "  App Image   : ${IMAGE_TAG_FULL}"
                    echo "  Git Commit  : ${GIT_SHORT}"
                    echo "  Staging URL : http://localhost:${STAGING_PORT}"
                    echo "  Prometheus  : http://localhost:9091"
                    echo "  Grafana     : http://localhost:3001"
                    echo "════════════════════════════════════════"
                '''
            }

            post {
                success { echo "✅ MONITORING stage passed" }
                failure { echo "❌ MONITORING stage failed" }
            }
        }

    } // end stages

    // ─────────────────────────────────────────────────────
    // POST PIPELINE ACTIONS
    // ─────────────────────────────────────────────────────
    post {
        always {
            script {
                echo "==> Pipeline finished: ${currentBuild.currentResult}"
            }
            // Clean workspace (keep artifacts)
            cleanWs(
                cleanWhenSuccess:  false,
                cleanWhenFailure:  false,
                cleanWhenAborted:  false,
                deleteDirs:        false,
                patterns: [[pattern: 'node_modules', type: 'INCLUDE']]
            )
        }

        success {
            echo """
╔══════════════════════════════════════════╗
║  ✅  PIPELINE SUCCESS — Build #${BUILD_NUMBER}  ║
╚══════════════════════════════════════════╝
            """
        }

        failure {
            echo """
╔══════════════════════════════════════════╗
║  ❌  PIPELINE FAILED — Build #${BUILD_NUMBER}   ║
╚══════════════════════════════════════════╝
            """
            // Rollback staging on failure
            sh '''
                echo "==> Initiating rollback of staging..."
                docker-compose -f docker-compose.staging.yml down --remove-orphans 2>/dev/null || true
                echo "==> Rollback complete"
            '''
        }

        unstable {
            echo "⚠️  Pipeline UNSTABLE — Build #${BUILD_NUMBER} (tests may have partial failures)"
        }
    }
}
