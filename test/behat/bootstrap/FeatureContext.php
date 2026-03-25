<?php
use Behat\Behat\Context\Context;
use Behat\Behat\Hook\Scope\AfterScenarioScope;
use Behat\Behat\Hook\Scope\BeforeScenarioScope;
use Behat\Gherkin\Node\PyStringNode;
use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\Remote\DesiredCapabilities;
use Facebook\WebDriver\Remote\RemoteWebDriver;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverWait;

class FeatureContext implements Context
{
    private const DEFAULT_TIMEOUT_SECONDS = 5;

    private ?RemoteWebDriver $driver = null;
    private string $appUrl;

    /** @BeforeScenario */
    public function beforeScenario(BeforeScenarioScope $scope): void
    {
        $this->appUrl = rtrim(getenv("APP_URL") ?: "http://app:8000/example", "/");
        $webDriverUrl = getenv("WEBDRIVER_URL") ?: "http://127.0.0.1:4444/wd/hub";

        $capabilities = DesiredCapabilities::firefox();
        $this->driver = RemoteWebDriver::create($webDriverUrl, $capabilities);
        $this->driver->manage()->timeouts()->implicitlyWait(1000);
        $this->driver->manage()->deleteAllCookies();
    }

    /** @AfterScenario */
    public function afterScenario(AfterScenarioScope $scope): void
    {
        if($this->driver) {
            $this->driver->quit();
            $this->driver = null;
        }
    }

    /**
     * @Given I am on :path
     */
    public function iAmOn(string $path): void
    {
        $this->driver()->get($this->appUrl . $path);
    }

    /**
     * @When I fill in :label with :value
     */
    public function iFillInWith(string $label, string $value): void
    {
        $field = $this->findFieldByLabelText($label);
        $field->clear();
        $field->sendKeys($value);
    }

    /**
     * @When I fill the element :selector with:
     */
    public function iFillTheElementWith(string $selector, PyStringNode $value): void
    {
        $this->fillElement($selector, (string)$value);
    }

    /**
     * @When I fill the element :selector with :value
     */
    public function iFillTheElementWithValue(string $selector, string $value): void
    {
        $this->fillElement($selector, $value);
    }

    /**
     * @When I press the element :selector
     */
    public function iPressTheElement(string $selector): void
    {
        $this->findCssElement($selector)->click();
    }

    /**
     * @When I click the element :selector
     */
    public function iClickTheElement(string $selector): void
    {
        $this->findCssElement($selector)->click();
    }

    /**
     * @Then the element :selector should contain :text
     */
    public function theElementShouldContain(string $selector, string $text): void
    {
        $actualText = trim($this->findCssElement($selector)->getText());
        if(!str_contains($actualText, $text)) {
            throw new RuntimeException(sprintf('Expected "%s" to contain "%s", got "%s".', $selector, $text, $actualText));
        }
    }

    /**
     * @Then the element :selector should have value :value
     */
    public function theElementShouldHaveValue(string $selector, string $value): void
    {
        $actualValue = (string)$this->findCssElement($selector)->getAttribute("value");
        if($actualValue !== $value) {
            throw new RuntimeException(sprintf('Expected "%s" to have value "%s", got "%s".', $selector, $value, $actualValue));
        }
    }

    /**
     * @Then I wait until the element :selector contains :text
     */
    public function iWaitUntilTheElementContains(string $selector, string $text): void
    {
        $this->waitUntil(function() use ($selector, $text) {
            return str_contains(trim($this->findCssElement($selector)->getText()), $text);
        }, sprintf('Timed out waiting for "%s" to contain "%s".', $selector, $text));
    }

    /**
     * @Then I wait until the element :selector exists
     */
    public function iWaitUntilTheElementExists(string $selector): void
    {
        $this->waitUntil(function() use ($selector) {
            try {
                $this->findCssElement($selector);
                return true;
            }
            catch(RuntimeException) {
                return false;
            }
        }, sprintf('Timed out waiting for "%s" to exist.', $selector));
    }

    /**
     * @Then I wait until I do not see :text
     */
    public function iWaitUntilIDoNotSee(string $text): void
    {
        $this->waitUntil(function() use ($text) {
            return !str_contains($this->driver()->findElement(WebDriverBy::tagName("body"))->getText(), $text);
        }, sprintf('Timed out waiting for "%s" to disappear.', $text));
    }

    private function fillElement(string $selector, string $value): void
    {
        $element = $this->findCssElement($selector);
        $element->clear();
        $element->sendKeys($value);
    }

    private function driver(): RemoteWebDriver
    {
        if(!$this->driver) {
            throw new RuntimeException("The browser session has not been initialised.");
        }

        return $this->driver;
    }

    private function findCssElement(string $selector)
    {
        try {
            return $this->driver()->findElement(WebDriverBy::cssSelector($selector));
        }
        catch(NoSuchElementException $exception) {
            throw new RuntimeException(sprintf('Could not find element matching CSS selector "%s".', $selector), 0, $exception);
        }
    }

    private function findFieldByLabelText(string $labelText)
    {
        $xpath = sprintf(
            "//label[normalize-space(.)=%s]//*[self::input or self::textarea or self::select]"
            . " | //label[.//text()[normalize-space(.)=%s]]//*[self::input or self::textarea or self::select]",
            $this->xpathLiteral($labelText),
            $this->xpathLiteral($labelText),
        );

        try {
            return $this->driver()->findElement(WebDriverBy::xpath($xpath));
        }
        catch(NoSuchElementException $exception) {
            throw new RuntimeException(sprintf('Could not find a field for label "%s".', $labelText), 0, $exception);
        }
    }

    private function waitUntil(callable $callback, string $errorMessage, int $timeoutSeconds = self::DEFAULT_TIMEOUT_SECONDS): void
    {
        $wait = new WebDriverWait($this->driver(), $timeoutSeconds, 250);
        try {
            $wait->until(function() use ($callback) {
                return $callback() ?: null;
            });
        }
        catch(Throwable $throwable) {
            throw new RuntimeException($errorMessage, 0, $throwable);
        }
    }

    private function xpathLiteral(string $value): string
    {
        if(!str_contains($value, "'")) {
            return "'" . $value . "'";
        }

        if(!str_contains($value, '"')) {
            return '"' . $value . '"';
        }

        $parts = explode("'", $value);
        $escaped = array_map(static fn(string $part) => "'" . $part . "'", $parts);
        return "concat(" . implode(", \"'\", ", $escaped) . ")";
    }
}
